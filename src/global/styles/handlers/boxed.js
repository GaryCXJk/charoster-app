export const constructRectangleClipPath = (val) => {
  const points = [];
  const corners = [['top', 'left'], ['top', 'right'], ['bottom', 'right'], ['bottom', 'left']];
  corners.forEach((corner, index) => {
    const x = (index === 0 || index === 3) ? '0%' : '100%';
    const y = (index === 0 || index === 1) ? '0%' : '100%';
    const cornerKey = `${corner[0]}${corner[1].charAt(0).toUpperCase()}${corner[1].slice(1)}`;
    const value = val[cornerKey] ?? val[corner[0]] ?? val[corner[1]] ?? val.chamfer ?? 0;
    if (value) {
      switch (index) {
        case 0:
          points.push(`0% ${value}`);
          points.push(`${value} 0%`);
          break;
        case 1:
          points.push(`calc(100% - ${value}) 0%`);
          points.push(`100% ${value}`);
          break;
        case 2:
          points.push(`100% calc(100% - ${value})`);
          points.push(`calc(100% - ${value}) 100%`);
          break;
        case 3:
          points.push(`${value} 100%`);
          points.push(`0% calc(100% - ${value})`);
          break;
        default:
          break;
      }
    } else {
      points.push(`${x} ${y}`);
    }
  });
  return `polygon(${points.join(', ')})`;
};

export const handleBoxed = (val, styleObject = null) => {
  const styleProps = {};
  if (!val) {
    styleProps['clip-path'] = 'none';
  } else if (typeof val === 'object') {
    switch (val.type) {
      case 'circle':
        styleProps['clip-path'] = `circle(${val.size ?? '50%'})`;
        break;
      case 'ellipse':
        styleProps['clip-path'] = `ellipse(${val.width ?? '50%'} ${val.height ?? '50%'})`;
        break;
      case 'diamond':
        styleProps['clip-path'] = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
        break;
      case 'rectangle':
        styleProps['clip-path'] = constructRectangleClipPath(val);
        break;
      case 'polygon':
        if (Array.isArray(val.points)) {
          const pointsStr = val.points.map((point) => `${point.x} ${point.y}`).join(', ');
          styleProps['clip-path'] = `polygon(${pointsStr})`;
        }
        break;
      default:
        break;
    }
  } else if (typeof val === 'string' && val.startsWith('clipPath:')) {
    styleProps['clip-path'] = val.slice(9);
  }

  if (styleObject) {
    Object.assign(styleObject, styleProps);
  }
  return styleProps;
};
