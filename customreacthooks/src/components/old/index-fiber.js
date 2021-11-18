import React from './react';
import ReactDOM from './react-dom';
// 虚拟DOM就是一个js对象
const styles = { border: 'solid 10px red', margin: '5px' };

let element = (
  <div id='A1' style={styles}>
    A1
    <div id='B1' style={styles}>
      B1
      <div id='C1' style={styles}>
        C1
      </div>
      <div id='C2' style={styles}>
        C2
      </div>
    </div>
    <div id='B2' style={styles}>
      B2
    </div>
  </div>
);

console.log(element, 22222222);
ReactDOM.render(element, document.getElementById('root'));
let render2 = document.getElementById('render2');

render2.addEventListener('click', () => {
  let element2 = (
    <div id='A1-new' style={styles}>
      A1-new
      <div id='B1-new' style={styles}>
        B1-new
        <div id='C1-new' style={styles}>
          C1-new
        </div>
        <div id='C2-new' style={styles}>
          C2-new
        </div>
      </div>
      <div id='B2-new' style={styles}>
        B2-new
      </div>
      <div id='B3' style={styles}>
        B3-new
      </div>
    </div>
  );
  ReactDOM.render(element2, document.getElementById('render2'));
});
let render3 = document.getElementById('render3');
render3.addEventListener('click', () => {
  let element3 = (
    <div id='A1-new' style={styles}>
      A2-new
      <div id='B1-new' style={styles}>
        B2-new
        <div id='C1-new' style={styles}>
          C2-new
        </div>
        <div id='C2-new' style={styles}>
          C2-new
        </div>
      </div>
      <div id='B2-new' style={styles}>
        B3-new
      </div>
      <div id='B3' style={styles}>
        B3-new
      </div>
    </div>
  );
  ReactDOM.render(element3, document.getElementById('render3'));
});
