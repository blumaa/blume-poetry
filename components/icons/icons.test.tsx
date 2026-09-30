import { render } from '@testing-library/react';
import { GLYPH_NAMES, Icon, IconRegistry } from '.';

describe('icon registry', () => {
  it.each(GLYPH_NAMES)('draws %s', (name) => {
    const { container } = render(
      <IconRegistry>
        <Icon name={name} />
      </IconRegistry>
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('names a meaningful icon for screen readers and hides a decorative one', () => {
    const { getByRole, container } = render(
      <IconRegistry>
        <Icon name="pin" label="Pinned" />
        <Icon name="check" />
      </IconRegistry>
    );
    expect(getByRole('img', { name: 'Pinned' })).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });
});
