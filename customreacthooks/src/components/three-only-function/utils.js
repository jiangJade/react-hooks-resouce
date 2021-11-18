export function setProps(dom, oldProps, newProps) {
  for (let key in oldProps) {
    // 只管自己的属性
    if (key !== 'children') {
      if (newProps.hasOwnProperty('key')) {
        setProp(dom, key, newProps[key]); // 新老都有，更新
      } else {
        // 老的有新的没有删除
        dom.removeAttribute(key);
      }
    }
  }
  for (let key in newProps) {
    if (key !== 'children') {
      // 老的没有 新的有添加
      if (!oldProps.hasOwnProperty('key')) {
        setProp(dom, key, newProps[key]);
      }
      setProp(dom, key, newProps[key]);
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
