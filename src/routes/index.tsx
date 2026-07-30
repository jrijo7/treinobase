import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Home from '../pages/Home';
import { INITIAL_WORKOUTS, INITIAL_STUDENTS, getStoredData, setStoredData } from '../mockData';
import ProgressDashboard from '../pages/ProgressDashboard';
import PersonalDashboard from '../pages/PersonalDashboard';
import InvitationVincular from '../pages/InvitationVincular';
import WorkoutExecution from '../pages/WorkoutExecution';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/progress', element: <ProgressDashboard /> },
      { path: '/personal', element: <PersonalDashboard /> },
      { path: '/vincular', element: <InvitationVincular /> },
      { path: '/treino/:id/executar', element: <WorkoutExecution /> }
    ]
  }
]);

