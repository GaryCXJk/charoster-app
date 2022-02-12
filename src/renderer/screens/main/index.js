import titlebar from '@components/titlebar';
import './main.scss';

export default () => {
  const container = document.createElement('div');
  container.className = 'sections';

  container.appendChild(titlebar({
    hasIcon: true,
  }).element);

  const panels = document.createElement('div');
  panels.className = 'panels';
  container.appendChild(panels);

  panels.textContent = 'abcABC';

  const preview = document.createElement('div');
  preview.className = 'preview';
  container.appendChild(preview);

  return container;
}
