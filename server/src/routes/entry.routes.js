import express from "express"
import reqAuthMiddleware from "../middleware/reqAuth.js"
import {createEntry,listEntries, confirmentry, despuiteentry,settleentry} from "../controllers/entry.controller.js"

const router = express.Router()

router.post('/',reqAuthMiddleware,createEntry)
router.get('/',reqAuthMiddleware,listEntries)
router.post('/:id/confirm', reqAuthMiddleware, confirmentry)
router.post('/:id/dispute', reqAuthMiddleware, despuiteentry)
router.post('/:id/settle', reqAuthMiddleware, settleentry)

export default router