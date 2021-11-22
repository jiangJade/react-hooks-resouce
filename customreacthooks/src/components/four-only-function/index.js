import React from './react';
import ReactDom from './react-dom';
const style = { border: 'solid 2px red', margin: '20px' };

const element = (
  <div id='A1' style={style}>
    A1
    <div id='B1' style={style}>
      B1
      <div id='C1' style={style}>
        C1
      </div>
      <div id='C2' style={style}>
        C1
      </div>
    </div>
    <div id='B2' style={style}>
      B2
    </div>
  </div>
);

ReactDom.render(element, document.getElementById('root'));