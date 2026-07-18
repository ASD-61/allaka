import { Alert as RNAlert, Platform } from 'react-native';

type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
}

// react-native-web ships Alert.alert as a total no-op (`static alert() {}`),
// so every confirm/error dialog in this app silently did nothing on web.
// This wrapper keeps the Alert.alert(title, message, buttons) call signature
// but uses window.alert / confirm / prompt on web so callbacks actually run.
function showOnWeb(title?: string, message?: string, buttons?: AlertButton[]): void {
  const text = [title, message].filter(Boolean).join('\n\n');

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const actionButtons = buttons.filter((b) => b.style !== 'cancel');

  // Two-button confirm (OK / Cancel) — the common case for logout/delete.
  if (actionButtons.length === 1) {
    if (window.confirm(text)) {
      actionButtons[0].onPress?.();
    } else {
      cancelButton?.onPress?.();
    }
    return;
  }

  // 3+ action buttons (e.g. 3 / 6 / 12 months): window.confirm can only
  // express yes/no, so previously it always ran the FIRST action — which made
  // "renew subscription" silently add 3 months every time. Use a numbered
  // prompt instead so the admin picks the option explicitly.
  const lines = actionButtons.map((b, i) => `${i + 1}) ${b.text ?? `خيار ${i + 1}`}`);
  const promptText =
    `${text}\n\n${lines.join('\n')}\n\nاكتب رقم الخيار (أو اتركه فارغ للإلغاء):`;
  const answer = window.prompt(promptText, '');
  if (answer == null || answer.trim() === '') {
    cancelButton?.onPress?.();
    return;
  }
  const idx = parseInt(answer.trim(), 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= actionButtons.length) {
    window.alert('رقم غير صالح — تم الإلغاء');
    cancelButton?.onPress?.();
    return;
  }
  actionButtons[idx].onPress?.();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (Platform.OS === 'web') {
      showOnWeb(title, message, buttons);
      return;
    }
    RNAlert.alert(title, message, buttons);
  },
};
