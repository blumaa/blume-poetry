import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconRegistry } from '@/components/icons';
import type { EmojiChoice } from './api/emoji';
import { ReactionPicker } from './ReactionPicker';

const smiley = (char: string, name: string, extra: Partial<EmojiChoice> = {}): EmojiChoice => ({
  char,
  name,
  tags: [],
  category: 'smileys',
  base: null,
  tone: null,
  quick: false,
  ...extra,
});

const catalogue: EmojiChoice[] = [
  smiley('❤️', 'Red heart', { quick: true }),
  smiley('😂', 'Tears of joy', { quick: true }),
  smiley('🙏', 'Folded hands'),
  smiley('😮', 'Open mouth'),
];

const wider: EmojiChoice[] = [
  ...catalogue,
  smiley('👍', 'Thumbs up', { category: 'people' }),
  smiley('👍🏾', 'Thumbs up: medium-dark', { category: 'people', base: '👍', tone: 4 }),
  smiley('🌙', 'Crescent moon', { category: 'travel', tags: ['night'], quick: true }),
];

function renderPicker(props: Partial<Parameters<typeof ReactionPicker>[0]> = {}) {
  return render(
    <IconRegistry>
      <ReactionPicker emoji={catalogue} onSelect={() => {}} {...props} />
    </IconRegistry>
  );
}

const grid = () => screen.getByRole('group', { name: 'Emoji' });
const cells = () => within(grid()).queryAllByRole('button');
const quick = () => screen.getByRole('group', { name: 'Quick reactions' });

beforeEach(() => localStorage.clear());

describe('ReactionPicker', () => {
  it('draws the open tab’s emoji in catalogue order, named from the catalogue', () => {
    renderPicker();

    expect(cells().map((el) => el.textContent)).toEqual(['❤️', '😂', '🙏', '😮']);
    expect(within(grid()).getByRole('button', { name: 'Tears of joy' })).toBeInTheDocument();
  });

  it('hands back the emoji that was picked and remembers it as recent', async () => {
    const onSelect = jest.fn();
    renderPicker({ onSelect });

    await userEvent.click(within(grid()).getByRole('button', { name: 'Folded hands' }));

    expect(onSelect).toHaveBeenCalledWith('🙏');
    expect(localStorage.getItem('recent_emoji')).toBe('["🙏"]');
  });

  it('marks every emoji the reader already left, and no other', () => {
    renderPicker({ selected: ['😂', '🙏'] });

    expect(within(grid()).getByRole('button', { name: 'Tears of joy' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(grid()).getByRole('button', { name: 'Folded hands' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(grid()).getByRole('button', { name: 'Red heart' })).toHaveAttribute('aria-pressed', 'false');
  });

  describe('quick row', () => {
    it('shows the catalogue’s quick emoji from every tab', () => {
      renderPicker({ emoji: wider });

      expect(within(quick()).getAllByRole('button').map((el) => el.textContent)).toEqual(['❤️', '😂', '🌙']);
    });

    it('puts the reader’s recent ones first', () => {
      localStorage.setItem('recent_emoji', '["🙏"]');
      renderPicker({ emoji: wider });

      expect(within(quick()).getAllByRole('button').map((el) => el.textContent)).toEqual([
        '🙏',
        '❤️',
        '😂',
        '🌙',
      ]);
    });

    it('drops a recent emoji the catalogue no longer has', () => {
      localStorage.setItem('recent_emoji', '["🦖"]');
      renderPicker();

      expect(within(quick()).getAllByRole('button').map((el) => el.textContent)).toEqual(['❤️', '😂']);
    });
  });

  describe('searching', () => {
    it('keeps the ones whose name matches, inside the name, ignoring case and spaces', async () => {
      renderPicker();

      await userEvent.type(screen.getByRole('searchbox'), '  JOY ');

      expect(cells().map((el) => el.textContent)).toEqual(['😂']);
    });

    it('reaches past the open tab, through the tags too', async () => {
      renderPicker({ emoji: wider });

      await userEvent.type(screen.getByRole('searchbox'), 'night');

      expect(cells().map((el) => el.textContent)).toEqual(['🌙']);
    });

    it('says so when nothing matches', async () => {
      renderPicker();

      await userEvent.type(screen.getByRole('searchbox'), 'zzz');

      expect(screen.queryByRole('group', { name: 'Emoji' })).toBeNull();
      expect(screen.getByText('No emoji match that')).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('open on smileys and move to the one chosen', async () => {
      renderPicker({ emoji: wider });

      await userEvent.click(screen.getByRole('button', { name: 'Travel' }));

      expect(cells().map((el) => el.textContent)).toEqual(['🌙']);
      expect(screen.getByRole('button', { name: 'Travel' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('show the hearts under smileys', () => {
      renderPicker();

      expect(screen.getByRole('button', { name: 'Smileys' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(grid()).getByRole('button', { name: 'Red heart' })).toBeInTheDocument();
    });
  });

  it('draws the chosen skin tone, and remembers it', async () => {
    const { unmount } = renderPicker({ emoji: wider });
    await userEvent.click(screen.getByRole('button', { name: 'People' }));
    await userEvent.click(screen.getByRole('radio', { name: '✋🏾' }));

    expect(cells().map((el) => el.textContent)).toEqual(['👍🏾']);

    unmount();
    renderPicker({ emoji: wider });
    await userEvent.click(screen.getByRole('button', { name: 'People' }));

    expect(cells().map((el) => el.textContent)).toEqual(['👍🏾']);
  });

  describe('while the catalogue is still arriving', () => {
    it('draws ghosts, not an empty message', () => {
      const { container } = renderPicker({ emoji: [], loading: true });

      expect(container.querySelector('[aria-busy="true"]')?.children).toHaveLength(24);
      expect(screen.queryByText('No emoji match that')).toBeNull();
    });
  });

  describe('while a pick is being written', () => {
    it('keeps the grid drawn but locks every cell', () => {
      renderPicker({ selected: ['😂'], pending: true });

      expect(cells()).toHaveLength(4);
      expect(within(grid()).getByRole('button', { name: 'Red heart' })).toBeDisabled();
      expect(within(quick()).getByRole('button', { name: 'Red heart' })).toBeDisabled();
      expect(grid()).toHaveAttribute('aria-busy', 'true');
    });
  });
});
