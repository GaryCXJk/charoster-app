import titlebar from '@components/titlebar';
import Block from '../../components/base/Block';
import './properties.scss';

export default () => {
  const container = new Block({
    className: 'sections',
  });

  const title = titlebar({
    title: 'Properties',
    closable: false,
    minimizable: false,
  });
  container.append(title);

  return container.element;
}
