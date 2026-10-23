import express from "express"
import reqAuthMiddleware from "../middleware/reqAuth.js"
import {createEntry,listEntries, confirmentry, disputeentry,settleentry} from "../controllers/entry.controller.js"

const router = express.Router()

router.post('/',reqAuthMiddleware,createEntry)
router.get('/',reqAuthMiddleware,listEntries)
router.post('/:id/confirm', reqAuthMiddleware, confirmentry)
router.post('/:id/dispute', reqAuthMiddleware, disputeentry)
router.post('/:id/settle', reqAuthMiddleware, settleentry)

export default router