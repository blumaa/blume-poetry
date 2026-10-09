import { fireEvent, render } from '@testing-library/react';
import { PoemGestures } from '@/components/PoemGestures';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => push.mockClear());

/* Right goes back in time (older), left forward (newer), matching the links. */
describe('PoemGestures', () => {
  it('moves to the older poem on ArrowRight and the newer on ArrowLeft', () => {
    render(<PoemGestures prevSlug="older" nextSlug="newer" />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(push.mock.calls).toEqual([['/poem/older'], ['/poem/newer']]);
  });

  it('ignores arrows while typing in a field', () => {
    const { container } = render(
      <>
        <input />
        <PoemGestures prevSlug="older" nextSlug="newer" />
      </>
    );

    fireEvent.keyDown(container.querySelector('input')!, { key: 'ArrowRight' });

    expect(push).not.toHaveBeenCalled();
  });

  it('does nothing at the end of the list', () => {
    render(<PoemGestures nextSlug="newer" />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(push).not.toHaveBeenCalled();
  });

  it('swipes left to the older poem', () => {
    render(<PoemGestures prevSlug="older" nextSlug="newer" />);

    fireEvent.touchStart(window, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(window, { changedTouches: [{ clientX: 100, clientY: 110 }] });

    expect(push).toHaveBeenCalledWith('/poem/older');
  });

  it('ignores a mostly vertical swipe', () => {
    render(<PoemGestures prevSlug="older" nextSlug="newer" />);

    fireEvent.touchStart(window, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(window, { changedTouches: [{ clientX: 140, clientY: 300 }] });

    expect(push).not.toHaveBeenCalled();
  });

  it('uses the latest slugs after navigating, without re-subscribing', () => {
    const { rerender } = render(<PoemGestures prevSlug="older" />);
    rerender(<PoemGestures prevSlug="oldest" />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(push).toHaveBeenCalledWith('/poem/oldest');
  });
});
