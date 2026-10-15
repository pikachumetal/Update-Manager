# Capacidad — cli-common

## Propósito

`um --version`, `um --help` y el error inesperado de `main`

## Requisitos

### Versión

- GIVEN cualquier estado
- WHEN `um --version` (o `um -v`)
- THEN se imprime una sola línea, `um v0.1.0`, sin marco ni escapes, también en una terminal, y sale con 0

### Ayuda

- GIVEN cualquier estado
- WHEN `um --help` (o `um -h`)
- THEN se ve `┌   Update Manager v0.1.0 `, `│`, `│  Usage:` y las 7 filas de uso de hoy con el raíl delante (`│    um                     Interactive mode` … `│    um ignored             List ignored packages`), `│`, `│  Options:` y sus 3 filas (`│    -y, --yes             Skip confirmation`, `│    -v, --version         Show version`, `│    -h, --help            Show help`), `│`, `│  Examples:` y sus 5 filas (`│    um check              Check all providers` … `│    um ignore Google.GooglePlayGames`), y `└`; sale con 0
- AND con `um --help > out.txt`, `out.txt` contiene las mismas líneas sin escapes

### Error inesperado

- GIVEN un error que nadie captura antes de `main` (p. ej. un provider de `um check <provider>` que lanza `boom`)
- WHEN llega al handler de `main`
- THEN stderr recibe `■  Error: boom` seguido del stack, sin `┌`, `│` ni `└`, y el código de salida es el de hoy

## Reglas de la capacidad

- **Dónde viven los datos**: no aplica; ni `--version` ni `--help` leen o escriben `config.json`.
- **Idioma de los nombres**: mensajes al usuario en inglés.
- **Límites**: no aplica.
- **Avisos**: el error inesperado de `main` (`■`, por stderr).
- **Regla ante conflicto**: no aplica.
