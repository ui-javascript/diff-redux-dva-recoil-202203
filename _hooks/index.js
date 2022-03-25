import { createSharedState } from './libs/state.utils';
import ReactDOM from 'react-dom';

// 创建一个状态实例
const countState = createSharedState(0);

const A = () => {
  // 在组件中使用 hooks 方式获取响应式数据
  const count = countState.use();
  return <div>A: {count}</div>;
};

const B = () => {
  const count = countState.use();

  // 使用 set 方法修改数据
  return <button onClick={() => countState.set(count + 1)}>Add</button>;
};

const C = () => {
  return (
    <button
      onClick={() => {
        // 使用 get 方法获取数据
        console.log(countState.get());
      }}
    >
      Get
    </button>
  );
};

function App() {
  return (
    <>
      <div>
        <A />
      </div>

      <div>
        <B />
      </div>

      <div>
        <C />
      </div>
    </>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
