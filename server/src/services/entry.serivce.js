import pool from "../config/db.js";



const RULES = {
    confirm: { who: "counterparty", from: ['pending'], to: ['confirmed'] },
    despuite: { who: "conterparty", from: ['pending'], to: ['despuite'] },
    settle: { who: "creator", from: ['pendind', 'confirmed', 'dipuite'], to: "settled" }
}

const createEntryService = async ({
    creatorId,
    normalizedPhone,
    type,
    amountPaise,
    cleanDescription,
    cleanName
}) => {
    const userResult = await pool.query(
        "SELECT id FROM users WHERE phone = $1",
        [normalizedPhone]
    );

    const counterparty = userResult.rows[0] ?? null;

    if (counterparty && counterparty.id === creatorId) {
        throw new Error("SELF_ENTRY_NOT_ALLOWED");
    }

    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");
        if (cleanName) {
            await pool.query('INSERT INTO contacts (owner_id, phone, name) VALUES ($1,$2,$3) ON CONFLICT(owner_id,phone) DO UPDATE SET name = EXCLUDED.name', [creatorId, normalizedPhone, cleanName])
        }

        const entryResult = await client.query(
            `INSERT INTO entries (
                creator_id,
                counterparty_id,
                counterparty_phone,
                type,
                amount_paise,
                description

            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                creatorId,
                counterparty?.id ?? null,
                normalizedPhone,
                type,
                amountPaise,
                cleanDescription
            ]
        );

        const entry = entryResult.rows[0];

        await client.query(
            `INSERT INTO entry_events (
                entry_id,
                actor_id,
                action
            )
            VALUES ($1, $2, $3)`,
            [entry.id, creatorId, "created"]
        );

        await client.query("COMMIT");

        return entry;

    } catch (err) {
        if (client) {
            await client.query("ROLLBACK").catch(() => { });
        }

        throw err;

    } finally {
        client?.release();
    }
};



const transitionEntry = async (entryId, actorId, action) => {
    const rule = RULES[action]

    if (!rule) {
        const error = new Error("invalid entry action")
        error.code = "BAD_REQUEST"
        throw error
    }


    let client
    try {
        client = await pool.connect()
        await client.query("BEGIN")

        const result = await client.query(`SELECT id, creator_id,counterparty_id, status FROM entries WHERE id = $1 FOR UPDATE`, [entryId])
        const entry = result.rows[0]

        if (!entry || (entry.creator_id !== actorId && entry.counterparty_id !== actorId)) {
            const error = new Error("entry not found")
            error.code = "NOT_FOUND"
            throw error
        }

        const role = entry.creator_id === actorId ? "creator" : "counterparty"

        if (role !== rule.who) {
            const error = new Error("you cannot perform this action")
            error.code = "FORBIDDEN"
            throw error
        }

        if (!rule.from.includes(entry.status)) {
            const error = new Error("invalid entry status transition")
            error.code = "CONFLICT"
            throw error
        }

        const updatedResult = await client.query(`UPDATE entries SET status = $2, updated_at = now(), settled_at = CASE WHEN $3 THEN now() END WHERE id = $1 RETURNING  *`, [entryId, rule.to = "settled"])
        const updatedEntry = updatedResult.rows[0];

        const eventAction = action === "dispute" ? "disputed": rule.to

        await client.query(`INSERT INTO entry_events(entry_id,actor_id,action) VALUES ($1,$2,$3)`,[entryId,actorId,eventAction])

        await client.query("COMMIT")

        return updatedEntry

    }catch(error){
        if(client){
            try{
                await client.query("ROLLBACK")
            }catch(rollbackError){
                console.error("transtion rollback failed:",rollbackError)
            }
        }
        throw error
    }finally{
        client?.release()
    }
}

const listEntriesForUser = async (UserId, limit, offset) => {
    const sql = `SELECT
            e.id,
            e.type,
            e.amount_paise,
            e.status,
            e.description,
            e.created_at,
            CASE WHEN e.creator_id = $1 THEN 'lender' ELSE 'borrower' END AS role,
            CASE WHEN e.creator_id = $1
                 THEN COALESCE(ct.name, e.counterparty_phone)
                 ELSE cr.name END AS other_party,
            CASE WHEN e.creator_id = $1
                 THEN e.counterparty_phone END AS counterparty_phone
        FROM entries e
        JOIN users cr ON cr.id = e.creator_id
        LEFT JOIN contacts ct
               ON ct.owner_id = $1
              AND ct.phone = e.counterparty_phone
        WHERE e.creator_id = $1 OR e.counterparty_id = $1
        ORDER BY e.created_at DESC
        LIMIT $2 OFFSET $3`

    const result = await pool.query(sql, [UserId, limit, offset])
    return result.rows
}



export { createEntryService, listEntriesForUser ,transitionEntry};



