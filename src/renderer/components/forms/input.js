import Block from "../base/Block"
import './forms.scss';

export default ({
  id,
  label,
  placeholder = '',
  value = '',
} = {
}) => {
  const container = new Block({
    className: 'form-element',
  });

  const labelEl = new Block({
    element: 'label',
    htmlFor: id,
    textContent: label,
  });
  container.append(labelEl);

  const input = new Block({
    element: 'input',
    id,
    placeholder,
    value,
  });
  container.append(input);

  container.onInput = (callback) => {
    input.on('input', callback);
  };

  Object.defineProperty(container, 'value', {
    get: () => input.element.value,
    set: (value) => {
      input.element.value = value;
    },
  });

  return container;
}
