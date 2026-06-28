export function sentimentEmoji(s: string): string {
  switch (s) {
    case 'positive':
      return '😍';
    case 'negative':
      return '😢';
    default:
      return '👀';
  }
}

export function sentimentLabelKey(s: string): string {
  switch (s) {
    case 'positive':
      return 'history.positive';
    case 'negative':
      return 'history.negative';
    default:
      return 'history.neutral';
  }
}
