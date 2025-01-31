import { WithJazz, useJazz, DemoAuth } from 'jazz-react';
import ReactDOM from 'react-dom/client';
import { HashRoute } from 'hash-slash';
import { ChatWindow } from './chatWindow.tsx';
import { Chat } from './dataModel.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <WithJazz auth={DemoAuth({ appName: 'Jazz Chat Example' })} apiKey="api_z9d034j3t34ht034ir">
    <App />
  </WithJazz>,
);

function App() {
  return <div className='flex flex-col items-center justify-between w-screen h-screen p-2 dark:bg-black dark:text-white'>
    <button onClick={useJazz().logOut} className='rounded mb-5 px-2 py-1 bg-stone-200 dark:bg-stone-800 dark:text-white self-end'>
      Log Out
    </button>
    {HashRoute({
      '/': <Home />,
      '/chat/:id': (id) => <ChatWindow chatId={id as Chat['id']} />,
    })}
  </div>
}

function Home() {
  const { me } = useJazz();
  return <button className='rounded py-2 px-4 bg-stone-200 dark:bg-stone-800 dark:text-white my-auto'
    onClick={() => {
      const group = me.createGroup().addMember('everyone', 'writer');
      const chat = group.createList<Chat>();
      location.hash = '/chat/' + chat.id;
    }}>
    Create New Chat
  </button>
}
