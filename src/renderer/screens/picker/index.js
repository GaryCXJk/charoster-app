import Block from "@components/base/Block";
import titlebar from "../../components/titlebar";
import setPickerContent from "./picker-content";
import './picker.scss';

export default () => {
  const container = new Block({
    className: 'sections',
  });

  container.append(titlebar({
    title: 'Picker',
    closable: false,
    minimizable: false,
  }));

  const queryInputContainer = new Block({
    className: 'query-container',
  });
  container.append(queryInputContainer);

  const queryInput = document.createElement('input');
  queryInput.className = 'query';
  queryInputContainer.append(queryInput);

  const altPicker = new Block({
    className: 'alts',
  });

  const pickerContent = setPickerContent(queryInput, altPicker);
  container.append(pickerContent);

  container.append(altPicker);

  window.packs.getPackList();

  return container.element;
}
