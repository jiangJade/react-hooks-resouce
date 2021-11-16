export function setProps(dom, oldProps, newProps) {
  for (let key in oldProps) {
    if (key !== 'children') {
      if (newProps.hasOwnProperty(key)) {
        // 新老都要更新
        setProp(dom, key, newProps[key]);
      } else {
        // 老props里有此属性 新的没有删除
        dom.removeAttribute(key);
      }
    }
  }
  for (let key in newProps) {
    if (key !== 'children') {
      if (!oldProps.hasOwnProperty(key)) {
        // 老的没有 新的有 就添加
        setProp(dom, key, newProps[key]);
      }
    }
  }
}

function setProp(dom, key, value) {
  if (/^on/.test(key)) {
    // onClick
    dom[key.toLowerCase()] = value; // 没有合成事件
  } else if (key === 'style') {
    if (value) {
      for (let styleName in value) {
        dom.style[styleName] = value[styleName];
      }
    }
  } else {
    dom.setAttribute(key, value);
  }
}
