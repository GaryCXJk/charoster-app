import Block from "../base/Block"
import './forms.scss';

export default ({
  id,
  label,
  type = 'text',
  placeholder = '',
  value = '',
  disabled = false,
  inputProps = {},
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
    disabled,
    type,
    ...inputProps,
  });
  container.append(input);

  container.onInput = (callback) => {
    input.on('input', callback);
  };

  Object.defineProperties(container, {
    value: {
      get: () => input.element.value,
      set: (value) => {
        input.element.value = value;
      },
    },
    disabled: {
      get: () => !!input.element.disabled,
      set: (value) => {
        input.element.disabled = !!value;
      },
    },
  });

  return container;
}
