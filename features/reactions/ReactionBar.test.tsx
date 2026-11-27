import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { IconRegistry } from '@/components/icons';
import { ReactionBar } from './ReactionBar';

const REACTIONS = [
  { emoji: '❤️', count: 3 },
  { emoji: '🙏', count: 1 },
];

const noop = () => {};
const LABEL = 'Reactions to Ada’s comment';
const wrap = (ui: ReactNode) => render(<IconRegistry>{ui}</IconRegistry>);

describe('ReactionBar', () => {
  // One row stands under each comment, so each says which one it counts.
  it('names what the row belongs to', () => {
    wrap(<ReactionBar label={LABEL} reactions={REACTIONS} onSelect={noop} />);

    expect(screen.getByRole('group', { name: LABEL })).toBeInTheDocument();
  });

  it('reads each reaction out as its emoji and its count', () => {
    wrap(<ReactionBar label={LABEL} reactions={REACTIONS} onSelect={noop} />);

    expect(screen.getByRole('button', { name: '❤️, 3 reactions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🙏, 1 reaction' })).toBeInTheDocument();
  });

  it('puts the biggest count first', () => {
    wrap(
      <ReactionBar
        label={LABEL}
        reactions={[
          { emoji: '🙏', count: 1 },
          { emoji: '❤️', count: 9 },
        ]}
        onSelect={noop}
      />
    );

    expect(screen.getAllByRole('button')[0]).toHaveAccessibleName('❤️, 9 reactions');
  });

  it('marks every one the reader left as pressed', () => {
    wrap(<ReactionBar label={LABEL} reactions={REACTIONS} mine={['🙏']} onSelect={noop} />);

    expect(screen.getByRole('button', { name: '🙏, 1 reaction' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '❤️, 3 reactions' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('hands back the emoji that was pressed', async () => {
    const onSelect = jest.fn();
    wrap(<ReactionBar label={LABEL} reactions={REACTIONS} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: '❤️, 3 reactions' }));

    expect(onSelect).toHaveBeenCalledWith('❤️');
  });

  // A write is already on its way; a second tap would undo it.
  it('locks every control while a reaction is being written', () => {
    wrap(<ReactionBar label={LABEL} reactions={REACTIONS} onSelect={noop} onAdd={noop} pending />);

    for (const control of screen.getAllByRole('button')) expect(control).toBeDisabled();
  });

  it('still offers the way in when nobody has reacted yet', async () => {
    const onAdd = jest.fn();
    wrap(<ReactionBar label={LABEL} reactions={[]} onSelect={noop} onAdd={onAdd} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add a reaction' }));

    expect(onAdd).toHaveBeenCalled();
  });

  describe('past its limit', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      emoji: String.fromCodePoint(0x1f600 + index),
      count: 8 - index,
    }));

    it('keeps the rest behind a count', () => {
      wrap(<ReactionBar label={LABEL} reactions={many} onSelect={noop} max={6} />);

      expect(screen.getByRole('button', { name: 'Show 2 more' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '😇, 1 reaction' })).not.toBeInTheDocument();
    });

    it('shows them all once asked', async () => {
      wrap(<ReactionBar label={LABEL} reactions={many} onSelect={noop} max={6} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));

      expect(screen.getByRole('button', { name: '😇, 1 reaction' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Show 2 more' })).not.toBeInTheDocument();
    });
  });
});
