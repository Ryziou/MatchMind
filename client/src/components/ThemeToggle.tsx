import { Button } from 'primereact/button';
import { useTheme } from '../theme/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      icon={theme === 'dark' ? 'pi pi-sun' : 'pi pi-moon'}
      rounded
      text
      aria-label="Toggle theme"
      onClick={toggleTheme}
    />
  );
}
