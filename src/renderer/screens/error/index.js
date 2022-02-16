import Block from '../../components/base/Block';
import Button from '../../components/base/Button';
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

  const footer = new Block({
    className: 'footer',
  });
  container.append(footer);

  const okBtn = new Button({
    textContent: 'OK',
    on: {
      click: () => {
        window.curWin.close();
      },
    },
  });
  footer.append(okBtn);

  window.errors.getError().then(async (message) => {
    await document.fonts.ready;
    return message;
  }).then((message) => {
    textContent.append(message);
    const style = getComputedStyle(container.element);
    const windowHeight = Math.ceil(+style.height.replace(/px$/, ''));
    window.errors.showWindow(windowHeight);
  });

  return container.element;
}
