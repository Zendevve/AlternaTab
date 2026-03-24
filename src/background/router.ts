import {
  MESSAGE_TYPES,
  validateMessage,
  failure,
  ExtensionResponse
} from '../shared/messages';
import {
  handleSwitchTab, handleCloseTab, handleCopyUrl,
  handleTogglePin, handleDuplicate, handleToggleMute, handleMoveToNewWindow
} from './tabs';
import { handleSearchAssets } from './search';
import { logger } from '../shared/logger';

export function setupMessageRouter() {
  chrome.runtime.onMessage.addListener((
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ) => {
    // Validate incoming message
    if (!validateMessage(message)) {
      logger.warn('Invalid message received:', message);
      sendResponse(failure('Invalid message format', 'INVALID_FORMAT'));
      return false;
    }

    // Route to handler
    switch (message.type) {
      case MESSAGE_TYPES.SEARCH_ASSETS:
        handleSearchAssets(message.query)
          .then(sendResponse)
          .catch(e => {
            logger.error('Error handling SEARCH_ASSETS', e);
            sendResponse(failure(String(e), 'INTERNAL_ERROR'));
          });
        return true;

      case MESSAGE_TYPES.SWITCH_TAB:
        handleSwitchTab(message.tabId, message.windowId, message.url, message.itemType, message.sessionId)
          .then(sendResponse)
          .catch(e => {
            logger.error('Error handling SWITCH_TAB', e);
            sendResponse(failure(String(e), 'INTERNAL_ERROR'));
          });
        return true;

      case MESSAGE_TYPES.CLOSE_TAB:
        handleCloseTab(message.tabId)
          .then(sendResponse)
          .catch(e => {
            logger.error('Error handling CLOSE_TAB', e);
            sendResponse(failure(String(e), 'INTERNAL_ERROR'));
          });
        return true;

      case MESSAGE_TYPES.COPY_URL:
        handleCopyUrl(message.url)
          .then(sendResponse)
          .catch(e => {
            logger.error('Error handling COPY_URL', e);
            sendResponse(failure(String(e), 'INTERNAL_ERROR'));
          });
        return true;

      case MESSAGE_TYPES.TOGGLE_PIN_TAB:
        handleTogglePin(message.tabId)
          .then(sendResponse)
          .catch(e => {
            logger.error('Error handling TOGGLE_PIN_TAB', e);
            sendResponse(failure(String(e), 'INTERNAL_ERROR'));
          });
        return true;

      case MESSAGE_TYPES.DUPLICATE_TAB:
        handleDuplicate(message.tabId)
          .then(sendResponse)
          .catch(e => {
            logger.error('Error handling DUPLICATE_TAB', e);
            sendResponse(failure(String(e), 'INTERNAL_ERROR'));
          });
        return true;

      case MESSAGE_TYPES.TOGGLE_MUTE_TAB:
        handleToggleMute(message.tabId)
          .then(sendResponse)
          .catch(e => {
            logger.error('Error handling TOGGLE_MUTE_TAB', e);
            sendResponse(failure(String(e), 'INTERNAL_ERROR'));
          });
        return true;

      case MESSAGE_TYPES.MOVE_TO_NEW_WINDOW:
        handleMoveToNewWindow(message.tabId)
          .then(sendResponse)
          .catch(e => {
            logger.error('Error handling MOVE_TO_NEW_WINDOW', e);
            sendResponse(failure(String(e), 'INTERNAL_ERROR'));
          });
        return true;

      default:
        logger.error('Unknown message type handled by router:', message);
        sendResponse(failure('Unknown message type', 'UNKNOWN_TYPE'));
        return false;
    }
  });
}
