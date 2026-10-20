import { Radio } from '@/components/mds';
import styles from './ChoiceFieldset.module.css';

interface Choice<T extends string> {
  value: T;
  label: string;
}

interface ChoiceFieldsetProps<T extends string> {
  legend: string;
  /** Groups the radios; unique per form. */
  name: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A legend over a row of radios, one per choice. */
export function ChoiceFieldset<T extends string>({
  legend,
  name,
  choices,
  value,
  onChange,
}: ChoiceFieldsetProps<T>) {
  return (
    <fieldset>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.radioRow}>
        {choices.map((choice) => (
          <Radio
            key={choice.value}
            name={name}
            label={choice.label}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}
