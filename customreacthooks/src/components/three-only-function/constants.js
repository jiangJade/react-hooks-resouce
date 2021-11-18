//Symbol.for 先从注册表中找到对应的symbol 如果找到了就返回它 否则就新建

// 表示一个文本元素
export const ELEMENT_TEXT = Symbol.for('ELEMENT_TEXT');
// React 应用需要一个根Fiber
export const TAG_ROOT = Symbol.for('TAG_ROOT');
// 原生节点 span div p
export const TAG_HOST = Symbol.for('TAG_HOST');
//文本节点
export const TAG_TEXT = Symbol.for('TAG_TEXT');
// 插入节点
export const PLACEMENT = Symbol.for('PLACEMENT');
// 更新
export const UPDATE = Symbol.for('UPDATE');
//删除
export const DELETION = Symbol.for('DELETION');
// 添加
export const ADD = Symbol.for('ADD');
export const TAG_CLASS = Symbol.for('TAG_CLASS');
//函数组件
export const TAG_FUNCTION_COMPONENT = Symbol.for('TAG_FUNCTION_COMPONENT');
