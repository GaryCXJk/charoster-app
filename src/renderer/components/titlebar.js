import './titlebar.scss';

export default (options = {}) => {
  const {
    title = 'ChaRoster',
    hasIcon = false,
  } = options;
  const titlebar = document.createElement('div');
  titlebar.className = 'titlebar';

  if (hasIcon) {
    const icon = document.createElement('div');
    icon.className = 'icon';
    titlebar.appendChild(icon);
  }

  const label = document.createElement('h1');
  label.className = 'label';
  label.textContent = title;
  titlebar.appendChild(label);

  return titlebar;
};
