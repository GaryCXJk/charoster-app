import Block from '../../components/base/Block';
import titlebar from '../../components/titlebar';
import './error.scss';

export default () => {
  const container = new Block({
    className: 'sections',
  });

  container.append(titlebar({
    title: 'Error',
    minimizable: false,
  }));

  const textContent = new Block({
    className: 'error-message',
  });
  container.append(textContent);

  window.errors.getError().then((message) => {
    textContent.append(message);
    const style = getComputedStyle(container.element);
    const windowHeight = Math.ceil(+style.height.replace(/px$/, ''));
    window.errors.showWindow(windowHeight);
  });

  return container.element;
}
