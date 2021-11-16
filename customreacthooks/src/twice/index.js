/**
 * 1 expirationTime 任务的优先级 任务调度 超时时间处理
 * 2. reconcile domdiff的优化key处理
 * 3. 合成事件 syntheticEvent
 * 4. ref useRef useEffect
 *
 */

//  实现一个虚拟dom
import React from './react';
import ReactDom from './react-dom';

// useState 是一个语法糖， 基于useReducer

// class ClassCounter extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { number: 0 };
//   }
//   handleAdd = () => {
//     this.setState({
//       number: this.state.number + 1,
//     });
//   };
//   render() {
//     const { number } = this.state;
//     return (
//       <div id='counter'>
//         <span>{number}</span>
//         <button onClick={this.handleAdd}>加1</button>
//       </div>
//     );
//   }
// }

const ADD = 'ADD';
function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return { count: state.count + 1 };
    default:
      return state;
  }
}

function FunctionConter() {
  const [number, setNumber] = React.useState({ num: 0 });
  const [countState, dispatch] = React.useReducer(reducer, { count: 0 });

  return (
    <div style={{ margin: '100px' }}>
      <div id='counter1' style={{ marginBottom: '30px' }}>
        <span style={{ marginRight: '20px' }}>{number.num}</span>
        <button onClick={() => setNumber({ num: number.num + 1 })}>
          useState加1
        </button>
        <button
          style={{ marginLeft: '20px' }}
          onClick={() => setNumber({ num: number.num - 1 })}
        >
          useState减1
        </button>
      </div>
      <div id='counter2'>
        <span style={{ marginRight: '20px' }}>{countState.count}</span>
        <button onClick={() => dispatch({ type: ADD })}>加1</button>
      </div>
    </div>
  );
}
ReactDom.render(<FunctionConter />, document.getElementById('root'));
