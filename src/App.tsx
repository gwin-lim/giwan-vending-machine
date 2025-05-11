import './styles/App.css';
import VendingMachine from './components/VendingMachine';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>자판기</h1>
      </header>
      <main>
        <VendingMachine />
      </main>
      <footer>
        <p>Giwan Vending Machine</p>
      </footer>
    </div>
  );
}

export default App;
