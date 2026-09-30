import { setFlashToast, takeFlashToast } from './flashToast';
import { writeStored } from './browserStorage';

beforeEach(() => sessionStorage.clear());

describe('flashToast', () => {
  it('hands a toast to the next page exactly once', () => {
    setFlashToast({ title: 'Saved', tone: 'success' });
    expect(takeFlashToast()).toEqual({ title: 'Saved', tone: 'success' });
    expect(takeFlashToast()).toBeNull();
  });

  it('drops a malformed payload instead of throwing', () => {
    writeStored('flashToast', '{not json');
    expect(takeFlashToast()).toBeNull();
    writeStored('flashToast', JSON.stringify({ title: 1, tone: 'loud' }));
    expect(takeFlashToast()).toBeNull();
  });
});
