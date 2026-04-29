import api from './api';

const notepadService = {
  getNote: () => api.get('/notepad'),
  updateNote: (note) => api.post('/notepad', { note }),
  clearNote: () => api.delete('/notepad')
};

export default notepadService;
