import Block from '../../components/base/Block';
import './properties.scss';

export default () => {
  const container = new Block({
    className: 'sections',
  });

  return container.element;
}
