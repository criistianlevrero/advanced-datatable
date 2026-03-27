## 1. Propósito

Este documento define un conjunto completo de instrucciones para que un agente de IA genere documentación inicial estructurada a partir de un archivo de especificación provisto externamente.

El archivo de especificación (en adelante "Spec") contiene la descripción funcional, técnica o de negocio del sistema o feature a desarrollar.

El objetivo del agente es transformar ese input en un conjunto consistente de artefactos documentales que sirvan como base para implementación.

---

## 2. Supuestos

- El Spec es provisto como input separado.
    
- El Spec puede ser incompleto, ambiguo o contener inconsistencias.
    
- El agente NO debe asumir decisiones críticas sin explicitarlas.
    
- El output debe ser determinístico, estructurado y reutilizable.
    

---

## 3. Principios Operativos

1. **Separación de fases**: cada etapa tiene objetivos y outputs claros.
    
2. **Contratos explícitos**: interfaces y tipos deben definirse formalmente.
    
3. **Minimización de ambigüedad**: cualquier vacío debe resolverse o documentarse.
    
4. **Trazabilidad**: cada decisión debe poder rastrearse al Spec o a una inferencia explícita.
    
5. **Atomicidad**: dividir el sistema en unidades pequeñas e implementables.
    

---

## 3.1 Restricción Fundamental de Ejecución

El agente **NO debe generar código de implementación en esta etapa**.

En su lugar, debe producir exclusivamente:

- Documentación estructural
    
- Contratos formales
    
- Especificaciones de comportamiento
    
- Tests definidos al máximo nivel de granularidad posible
    

### Reglas específicas

- Cada unidad implementable (idealmente equivalente a un archivo futuro) debe tener:
    
    - Un contrato claro
        
    - Un comportamiento definido
        
    - Tests asociados
        
- Los tests deben ser lo suficientemente completos como para permitir que otro agente implemente sin ambigüedad
    
- Si es necesario, el agente debe bajar hasta nivel de **archivo individual**
    
- El output debe permitir un flujo **test-driven implementation** posterior
    

---

## 4. Fases del Proceso

### Fase 1 — Ingesta y Normalización del Spec

#### Objetivo

Transformar el Spec en una representación interna estructurada.

#### Acciones

- Leer completamente el Spec
    
- Identificar:
    
    - Objetivo del sistema
        
    - Actores
        
    - Casos de uso
        
    - Reglas de negocio
        
    - Restricciones técnicas
        
- Normalizar lenguaje (consistencia terminológica)
    

#### Output

Archivo: `01-normalized-spec.md`

Contenido:

- Resumen ejecutivo
    
- Glosario
    
- Lista de requerimientos normalizados
    

---

### Fase 2 — Identificación de Dominios y Boundaries

#### Objetivo

Definir los límites conceptuales del sistema.

#### Acciones

- Agrupar requerimientos por dominio
    
- Identificar:
    
    - Subdominios
        
    - Contextos acotados (bounded contexts)
        
    - Relaciones entre dominios
        

#### Output

Archivo: `02-domains.md`

Contenido:

- Mapa de dominios
    
- Descripción de cada dominio
    
- Interfaces entre dominios
    

---

### Fase 3 — Definición de Modelos y Tipos

#### Objetivo

Formalizar la estructura de datos.

#### Acciones

- Extraer entidades
    
- Definir:
    
    - Tipos
        
    - Interfaces
        
    - DTOs
        
    - Value Objects
        
- Especificar invariantes
    

#### Output

Archivo: `03-models.md`

Contenido:

- Definición de tipos (pseudo-TypeScript o similar)
    
- Relaciones entre entidades
    
- Reglas de validación
    

---

### Fase 4 — Definición de Casos de Uso

#### Objetivo

Describir comportamiento del sistema de forma operacional.

#### Acciones

- Convertir requerimientos en use cases
    
- Para cada caso:
    
    - Input
        
    - Output
        
    - Flujo principal
        
    - Edge cases
        

#### Output

Archivo: `04-use-cases.md`

Contenido:

- Lista completa de casos de uso
    
- Diagramas lógicos (si aplica, en texto)
    

---

### Fase 5 — Diseño de Interfaces (Contracts)

#### Objetivo

Definir contratos claros entre componentes.

#### Acciones

- Definir:
    
    - APIs
        
    - Servicios
        
    - Repositorios
        
- Especificar firmas
    

#### Output

Archivo: `05-interfaces.md`

Contenido:

- Interfaces tipadas
    
- Descripción semántica de cada método
    

---

### Fase 6 — Arquitectura de Alto Nivel

#### Objetivo

Definir estructura general del sistema.

#### Acciones

- Seleccionar patrón arquitectónico
    
- Definir capas (ej: domain, application, infra)
    
- Mapear componentes a capas
    

#### Output

Archivo: `06-architecture.md`

Contenido:

- Descripción de arquitectura
    
- Diagrama lógico (texto)
    
- Decisiones clave
    

---

### Fase 7 — Plan de Implementación

#### Objetivo

Descomponer el sistema en unidades implementables.

#### Acciones

- Dividir en features
    
- Dividir features en unidades mínimas (idealmente archivos)
    
- Ordenar por dependencias
    

#### Output

Archivo: `07-implementation-plan.md`

Contenido:

- Lista de unidades implementables
    
- Dependencias
    
- Prioridad
    

---

### Fase 8 — Especificación de Tests por Unidad

#### Objetivo

Definir completamente el comportamiento esperado sin escribir implementación.

#### Acciones

- Para cada unidad (archivo):
    
    - Definir tests unitarios
        
    - Definir edge cases
        
    - Definir casos negativos
        
- Asegurar que los tests describen completamente el comportamiento
    

#### Output

Archivo: `08-test-specs.md`

Contenido:

- Tests organizados por unidad/archivo
    
- Casos de prueba detallados
    
- Inputs/outputs esperados
    

---

## 5. Reglas de Generación

- No omitir fases
    
- No mezclar outputs entre archivos
    
- Mantener consistencia terminológica
    
- Evitar duplicación
    
- No generar código de implementación bajo ninguna circunstancia
    
- Priorizar especificaciones ejecutables (tests) sobre descripciones abstractas
    

---

## 6. Manejo de Ambigüedad

Si el Spec es ambiguo:

- Generar sección: `Open Questions`
    
- Proponer supuestos explícitos
    
- No bloquear generación
    

---

## 7. Formato de Salida

- Markdown
    
- Secciones claras
    
- Código solo para contratos, tipos y tests (NO implementación)
    
- Lenguaje técnico preciso
    

---

## 8. Resultado Esperado

Un conjunto de archivos que:

- Definen completamente el sistema sin implementar código
    
- Permiten que otro agente implemente usando únicamente tests y contratos
    
- Reducen al mínimo las decisiones durante la etapa de coding
    
- Están organizados a nivel de unidad implementable (archivo)
    

---

## 9. Ejecución

El agente debe:

1. Recibir el Spec
    
2. Ejecutar todas las fases en orden
    
3. Generar todos los archivos definidos
    
4. Mantener coherencia global
    
5. Detenerse antes de cualquier implementación
    

---

## 10. Criterios de Calidad

- Completitud
    
- Consistencia
    
- Bajo nivel de ambigüedad
    
- Implementabilidad directa a partir de tests
    

---

Fin del documento.