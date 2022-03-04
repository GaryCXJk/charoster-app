import Block from "../../../components/base/Block";
import '../../../components/forms/forms.scss';
import { getEntity } from "../../../components/panels/processing/entities";
import { convertImageDataArray } from "../../../components/panels/processing/image-helpers";
import { processImageDefinitionLayer } from "../../../components/panels/processing/layers/image";
import './picker.scss';

export default ({
  id,
  label,
  fieldData,
}) => {
  let values = {};
  let currentValue = null;
  let value = '';
  const et = new EventTarget();

  const container = new Block();

  const formContainer = new Block({
    className: 'form-element',
  });
  container.append(formContainer);

  container.onInput = (callback) => {
    et.addEventListener('input', callback);
  };

  const labelEl = new Block({
    element: 'label',
    htmlFor: id,
    textContent: label,
  });
  formContainer.append(labelEl);

  const pickerEl = new Block({
    className: 'image-picker',
  });
  formContainer.append(pickerEl);

  const defaultEl = new Block({
    className: 'picker-panel',
  });
  pickerEl.append(defaultEl);
  values[''] = pickerEl;
  currentValue = pickerEl;

  defaultEl.on('click', () => {
    setValue('');
    et.dispatchEvent(new CustomEvent('input', {
      detail: value,
    }));
  });

  const setValue = (newValue = null) => {
    if (newValue !== null) {
      value = newValue;
    }
    if (currentValue) {
      currentValue.element.classList.remove('active');
    }
    if (!values[value]) {
      value = '';
    }
    currentValue = values[value];
    currentValue.element.classList.add('active');
  }

  Object.defineProperty(container, 'value', {
    get: () => value,
    set: setValue,
  });

  container.reset = async ({
    type,
    entity,
    value: newValue,
  }) => {
    pickerEl.empty();
    container.empty();
    defaultEl.element.classList.remove('active');
    pickerEl.append(defaultEl);
    values = {};
    values[''] = defaultEl;
    currentValue = null;
    value = newValue;

    const entityInfo = await getEntity(type, entity.entityId);

    const color = getComputedStyle(document.body).getPropertyValue('--main-color');

    const defValue = entityInfo[fieldData.definition];
    if (defValue) {
      container.append(formContainer);
      const imageData = await window.definitions.getDefinitionValue(fieldData.definition, defValue, fieldData.field, entityInfo.pack ?? null);
      const imageMap = convertImageDataArray(imageData);

      const imageKeys = Object.keys(imageMap);
      for (let idx = 0; idx < imageKeys.length; idx++) {
        const imageLink = imageKeys[idx];
        const el = new Block({
          className: 'picker-panel',
        });
        pickerEl.append(el);

        const imgStr = await processImageDefinitionLayer({
          from: {
            definition: fieldData.definition,
            field: fieldData.field,
          },
          color,
        }, type, entity, imageLink);

        if (imgStr) {
          el.element.style.backgroundImage = `url(${imgStr})`;
        }

        el.on('click', () => {
          setValue(imageLink);
          et.dispatchEvent(new CustomEvent('input', {
            detail: value,
          }));
        });

        values[imageLink] = el;
      }
    }
    if (!values[value]) {
      value = '';
    }
    setValue();
  };

  return container;
};
