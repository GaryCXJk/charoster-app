import Block from "../base/Block"
import './forms.scss';

export default ({
  id,
  label,
  placeholder = '',
  value = '',
  options,
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
    element: 'select',
    id,
    placeholder,
  });
  container.append(input);

  options.forEach((option) => {
    const optionEl = new Block({
      element: 'option',
      value: option.id,
      textContent: option.label,
    });
    if (option.id === value) {
      optionEl.prop('selected', true);
    }
    input.append(optionEl);
  });


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
