/** @module uipi-message API for UIMessage */

/* eslint-disable-next-line no-unused-vars */
import UIMessage from "../ui/default/ui-message.js"
import * as strings from "../ui/default/strings.js"

class FailedWorkflowException extends Error {}

class UIPIMessage {

	/**
	 * @param {UIMessage} uiMessage
	 */
	constructor(uiMessage) {
		this._uiMessage = uiMessage
	}

	/**
	 * @param {AbortController} abortController
	 * @returns {Promise<boolean>}
	 */
	async process(abortController) {
		console.debug("UIPIMessage process")
		let actionButton
		let processed = false
		let unsent = false
		let reactionRemoved = false
		try {
			actionButton = await this.uiMessage.showActionsMenuButton(abortController)
			let actionsMenu = await this.uiMessage.openActionsMenu(actionButton, abortController)
			const reactionButton = this.uiMessage.findActionMenuItem(strings.REMOVE_REACTION_TEXT_VARIANTS)
			if (reactionButton) {
				await this.uiMessage.clickActionMenuItem(reactionButton, abortController)
				reactionRemoved = true
				processed = true
				actionsMenu = await this.uiMessage.openActionsMenu(actionButton, abortController)
			}

			const unsendButton = this.uiMessage.findActionMenuItem(strings.UNSEND_TEXT_VARIANTS)
			if (unsendButton) {
				const dialogButton = await this.uiMessage.openConfirmUnsendModal(unsendButton, abortController)
				await this.uiMessage.confirmUnsend(dialogButton, abortController)
				this.uiMessage.root.setAttribute("data-idmu-unsent", "")
				unsent = true
				processed = true
			} else if (!reactionRemoved) {
				processed = true
			}
			if (!unsent) {
				await this.uiMessage.closeActionsMenu(actionButton, actionsMenu, abortController)
			}
			if (processed && !unsent) {
				this.uiMessage.root.setAttribute("data-idmu-processed", "")
			}
			return { processed, unsent, reactionRemoved }
		} catch(ex) {
			console.error(ex)
			this.uiMessage.root.setAttribute("data-idmu-ignore", "")
			// Dismiss any open overlay so the next message starts clean
			try {
				const doc = this.uiMessage.root.ownerDocument
				doc.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
				await new Promise(resolve => setTimeout(resolve, 200))
				// If dialog is still open, press Escape again
				if (doc.querySelector("[role=dialog]")) {
					doc.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
					await new Promise(resolve => setTimeout(resolve, 200))
				}
			} catch (error) {
				console.error(error)
			}
			throw new FailedWorkflowException("Failed to execute workflow for this message", ex)
		}
	}

	/**
	 * Unsend this message while retaining the legacy boolean return value.
	 *
	 * @param {AbortController} abortController
	 * @returns {Promise<boolean>}
	 */
	async unsend(abortController) {
		return (await this.process(abortController)).unsent
	}

	/**
	 * @type {UIMessage}
	 */
	get uiMessage() {
		return this._uiMessage
	}

}
export { FailedWorkflowException }
export default UIPIMessage
