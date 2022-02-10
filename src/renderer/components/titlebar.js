import './titlebar.scss';

export default (options = {}) => {
  const {
    title = 'ChaRoster',
    hasIcon = false,
    minimizable = true,
    closable = true,
  } = options;
  const titlebar = document.createElement('div');
  titlebar.className = 'titlebar';

  const dragHandle = document.createElement('div');
  dragHandle.className = 'handle';
  titlebar.appendChild(dragHandle);

  if (hasIcon) {
    const icon = document.createElement('div');
    icon.className = 'icon';
    dragHandle.appendChild(icon);
  }

  const label = document.createElement('h1');
  label.className = 'label';
  label.textContent = title;
  dragHandle.appendChild(label);

  if (minimizable) {
    const minBtn = document.createElement('button');
    minBtn.type = 'button';
    minBtn.innerHTML = '_';
    titlebar.appendChild(minBtn);

    minBtn.addEventListener('click', () => {
      window.curWin.minimize();
    });
  }

  if (closable) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '&times;';
    titlebar.appendChild(closeBtn);

    closeBtn.addEventListener('click', () => {
      window.curWin.close();
    });
  }

  return titlebar;
};
