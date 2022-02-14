import params from '../../../helpers/params';
import dynamicStyle from './panelstyle/dynamic';

const stylePropTransforms = {
  dynamic: dynamicStyle,
};

const getStyleProperties = (currentRoster, roster) => {
  const returnStyle = {};

  returnStyle.alignment = {
    horizontal: 'center',
    vertical: 'center',
    ...(currentRoster.alignment ?? {})
  };

  if (returnStyle.alignment.horizontal === 'left') {
    returnStyle.alignment.horizontal = 'start';
  }

  if (returnStyle.alignment.vertical === 'top') {
    returnStyle.alignment.vertical = 'start';
  }

  if (stylePropTransforms[currentRoster.mode]) {
    stylePropTransforms[currentRoster.mode](currentRoster, roster, returnStyle)
  }

  return returnStyle;
};

const processCSSFilters = (filters) => {
  const processedFilters = [];

  filters.forEach((filter) => {
    const { type, value } = filter;
    let processedValue = [];
    switch (type) {
      case 'drop-shadow':
        processedValue.push(value.x, value.y);
        if (value.radius) {
          processedValue.push(value.radius);
        }
        if (value.color) {
          processedValue.push(value.color);
        }
        break;
      default:
        break;
    }
    processedFilters.push(`${type}(${processedValue.join(' ')})`);
  });
  return processedFilters.join(' ');
};

const createStyleString = (styles) => {
  const screen = params.screen;
  const dummy = document.createElement('div');
  const lines = [];

  Object.keys(styles).forEach((selector) => {
    const style = styles[selector];
    Object.assign(dummy.style, style);
    const rules = dummy.getAttribute('style');
    if (rules)  {
      lines.push(`#app.${screen} ${selector} { ${rules} }`);
    }
    dummy.setAttribute('style', '');
  });
  return lines.join('\n');
};

export const createStylesheet = ({
  design,
  currentRoster,
  roster,
}) => {
  const rosterStyle = getStyleProperties(currentRoster, roster);

  const panelImageFilters = processCSSFilters(design.panels.image.filters);
  const previewImageFilters = processCSSFilters(design.preview.image.filters);

  const combinedStyles = {};
  combinedStyles['.content'] = {
    padding: design.panels.margin,
  };

  combinedStyles['.panels'] = {
    justifyContent: rosterStyle.alignment.horizontal,
    alignContent: rosterStyle.alignment.vertical,
  };
  combinedStyles['.panel-container'] = {
    width: rosterStyle.panels.width,
    height: rosterStyle.panels.height,
    padding: design.panels.gap,
  };
  combinedStyles['.panels .panel'] = {};
  if (design.panels.border) {
    if (typeof design.panels.border === 'object') {
      if (design.panels.border.width) {
        combinedStyles['.panels .panel'].borderWidth = design.panels.border.width;
      }
      if (design.panels.border.style) {
        combinedStyles['.panels .panel'].borderStyle = design.panels.border.style;
      }
      if (design.panels.border.color) {
        combinedStyles['.panels .panel'].borderWidth = design.panels.border.color;
      }
    } else if (typeof design.panels.border === 'string') {
      combinedStyles['.panels .panel'].border = design.panels.border;
    }
  }
  if (panelImageFilters) {
    combinedStyles['.panels .panel .image'] = {
      filter: panelImageFilters,
    };
  }
  if (previewImageFilters) {
    combinedStyles['.preview .image'] = {
      filter: previewImageFilters,
    };
  }

  const screen = params.screen;

  return createStyleString(combinedStyles);
};
