export function ChapterBadge(props) {
  var number = props.number;
  var label = props.label;
  return React.createElement(
    'div',
    { style: { display: 'inline-flex', alignItems: 'center', gap: '16px', fontFamily: 'var(--font-display)' } },
    React.createElement('span', {
      style: { font: 'var(--text-chapter-number)', color: 'var(--color-white)', opacity: 0.9 }
    }, number),
    label ? React.createElement('span', {
      style: { font: 'var(--text-h2)', color: 'var(--color-white)' }
    }, label) : null
  );
}
