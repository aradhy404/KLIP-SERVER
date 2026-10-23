import { createEntryService, listEntriesForUser } from "../services/entry.serivce.js"
import normalizePhone from "../utils/phone.js"
import normalizeAmount from "../utils/amount.js";

import { transitionEntry } from "../services/entry.serivce.js";







const createEntry = async (req, res) => {
    const { type, amount, description, counterpartyPhone, counterpartyName } = req.body
    const normalizedPhone = normalizePhone(counterpartyPhone)
    if (!normalizedPhone) {
        return res.status(400).json({ error: "enter a valid number" })
    }
    if (!["money", "favour"].includes(type)) {
        return res.status(400).json({ error: "Type must be either favor or money" })
    }

    if (typeof description !== 'string' || typeof counterpartyName !== 'string') {
        return res.status(400).json({ error: "invalid formate" })
    }

    const cleanName = counterpartyName.trim()

    const cleanDescription = description.trim()

    if (cleanName.length > 100 || cleanName.length < 1) {
        return res.status(400).json({ error: "name should be under 100 characters" })
    }
    if (cleanDescription.length > 500) {
        return res.status(400).json({ error: "description should be under 500 characters" })
    }
    let amountPaise = null;

    if (type === "money") {
        amountPaise = normalizeAmount(amount);

        if (amountPaise === null) {
            return res.status(400).json({
                error: "Invalid amount"
            });
        }
    }
    try {
        const entry = await createEntryService({
            creatorId: req.user.id,
            normalizedPhone,
            type,
            amountPaise,
            cleanDescription,
            cleanName
        })
        res.status(201).json(entry)
    } catch (err) {
        console.error(err)
        res.status(400).json({ error: "failed to create the entry of the user" })
    }

}

const listEntries = async (req, res) => {
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit)
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset)
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || limit > 100 || offset < 0) {
        return res.status(400).json({ error: "invalid response" })
    }
    try {
        const getEntry = await listEntriesForUser(req.user.id, limit, offset)
        res.json(getEntry)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "failed to retrive user" })
    }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_BY_CODE = { BAD_REQUEST: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409 }

const transition = (action) => async (req, res) => {
    const { id } = req.params
    if (!UUID.test(id)) {
        return res.status(400).json({ error: "invalid request id" })
    }
    try {
        const entry = await transitionEntry(id, req.user.id, action)
        res.json(entry)
    } catch (err) {
        const status = STATUS_BY_CODE[err.code]
        if (status) {
            return res.status(status).json({ error: err.message })
        }
        console.log(err)
        res.status(400).json({ error: "invalid entry" })
    }
}

const confirmentry = transition("confirm")
const despuiteentry = transition("dispute")
const settleentry = transition("settle")

export { createEntry, listEntries,confirmentry,despuiteentry,settleentry }