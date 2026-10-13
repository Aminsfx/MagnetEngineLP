import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberField } from './NumberField';

function setup(props: Partial<React.ComponentProps<typeof NumberField>> = {}) {
    const onCommit = vi.fn();
    render(<NumberField aria-label="gap" value={3} min={3} max={60} onCommit={onCommit} {...props} />);
    return { input: screen.getByLabelText('gap') as HTMLInputElement, onCommit };
}

describe('NumberField', () => {
    it('can be emptied and retyped — nothing is clamped mid-typing', async () => {
        const { input, onCommit } = setup();
        await userEvent.clear(input);
        expect(input.value).toBe('');
        await userEvent.type(input, '10');
        expect(input.value).toBe('10');
        expect(onCommit).not.toHaveBeenCalled();

        await userEvent.tab();
        expect(onCommit).toHaveBeenCalledWith(10);
    });

    it('commits on Enter', async () => {
        const { input, onCommit } = setup();
        await userEvent.clear(input);
        await userEvent.type(input, '12{Enter}');
        expect(onCommit).toHaveBeenCalledWith(12);
    });

    it('clamps to the range when committing', async () => {
        const { input, onCommit } = setup();
        await userEvent.clear(input);
        await userEvent.type(input, '999');
        await userEvent.tab();
        expect(onCommit).toHaveBeenCalledWith(60);
    });

    it('keeps the old value when left empty', async () => {
        const { input, onCommit } = setup({ value: 8 });
        await userEvent.clear(input);
        await userEvent.tab();
        expect(onCommit).not.toHaveBeenCalled();
        expect(input.value).toBe('8');
    });

    it('accepts digits only', async () => {
        const { input } = setup();
        await userEvent.clear(input);
        await userEvent.type(input, '1e-5');
        expect(input.value).toBe('15');
    });
});
