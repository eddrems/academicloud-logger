# 📝 Ejemplos de Uso - MongoAuditoriaService

## 1️⃣ Configuración Inicial en Laravel

### Agregar al `.env`:
```bash
# MongoDB Auditoría
MONGODB_LOGGER_ENABLED=true
MONGODB_LOGGER_URL=http://localhost:3001
APP_INSTITUCION=eu_pasos
```

---

## 2️⃣ Uso Básico en Controllers

### Ejemplo 1: Auditoría al crear matrícula

```php
<?php

namespace App\Http\ControllersV2\Estudiantes;

use App\Services\MongoAuditoriaService;

class EstudiantesGestionController extends Controller
{
    public function crearMatricula(Request $request)
    {
        $auditoria = new MongoAuditoriaService();
        
        DB::beginTransaction();
        try {
            // ... código para crear matrícula
            $matricula = enrollMatricula::create([
                'estudiante_id' => $request->estudiante_id,
                'periodo_id' => $request->periodo_id,
                'grado_id' => $request->grado_id,
                // ...
            ]);
            
            DB::commit();
            
            // Registrar auditoría
            $auditoria->estudiante(
                'MATRICULA',                              // subtipo
                $request->estudiante_id,                  // id_referencia_principal
                $matricula->matricula_id,                 // id_referencia_secundario
                "Creación de Matrícula: {$matricula->numero_matricula}, {$matricula->grado->denominacion}",
                [
                    'periodo' => $matricula->periodo->denominacion,
                    'grado' => $matricula->grado->denominacion,
                    'tipo_matricula' => $matricula->matricula_tipo->denominacion
                ]
            );
            
            return response()->json([
                'result' => true,
                'message' => 'Matrícula creada exitosamente'
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            // Registrar error en auditoría
            $auditoria->estudiante(
                'MATRICULA',
                $request->estudiante_id,
                null,
                "Error al crear matrícula: {$e->getMessage()}"
            );
            
            return response()->json([
                'result' => false,
                'message' => 'Error al crear matrícula'
            ]);
        }
    }
}
```

---

### Ejemplo 2: Auditoría al actualizar estudiante

```php
public function actualizarEstudiante(Request $request)
{
    $auditoria = new MongoAuditoriaService();
    
    DB::beginTransaction();
    try {
        $estudiante = rrhhEstudiante::findOrFail($request->estudiante_id);
        $persona = rrhhPersona::findOrFail($estudiante->persona_id);
        
        // Guardar valores anteriores
        $valoresAnteriores = [
            'apellidos' => $persona->apellidos,
            'nombres' => $persona->nombres,
            'identificacion' => $persona->identificacion,
            'correo' => $persona->correo
        ];
        
        // Actualizar
        $persona->update($request->only(['apellidos', 'nombres', 'identificacion', 'correo']));
        $estudiante->update($request->only(['nacionalidad', 'lugar_nacimiento']));
        
        DB::commit();
        
        // Construir descripción de cambios
        $cambios = [];
        foreach (['apellidos', 'nombres', 'identificacion', 'correo'] as $campo) {
            if ($valoresAnteriores[$campo] != $persona->$campo) {
                $cambios[] = "$campo: {$valoresAnteriores[$campo]} → {$persona->$campo}";
            }
        }
        
        $auditoria->estudiante(
            'FICHA_ESTUDIANTE',
            $estudiante->estudiante_id,
            null,
            "Actualización de datos: " . implode(', ', $cambios),
            [
                'valores_anteriores' => $valoresAnteriores,
                'valores_nuevos' => [
                    'apellidos' => $persona->apellidos,
                    'nombres' => $persona->nombres,
                    'identificacion' => $persona->identificacion,
                    'correo' => $persona->correo
                ]
            ]
        );
        
        return response()->json(['result' => true]);
        
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['result' => false]);
    }
}
```

---

### Ejemplo 3: Auditoría de inscripciones

```php
public function crearInscripcion(Request $request)
{
    $auditoria = new MongoAuditoriaService();
    
    try {
        $inscripcion = enrollInscripcion::create($request->all());
        
        $auditoria->estudiante(
            'INSCRIPCION',
            $request->estudiante_id,
            $inscripcion->inscripcion_id,
            "Inscripción creada para periodo {$inscripcion->periodo->denominacion}, grado {$inscripcion->grado->denominacion}",
            [
                'numero_inscripcion' => $inscripcion->numero_inscripcion,
                'periodo' => $inscripcion->periodo->denominacion,
                'grado' => $inscripcion->grado->denominacion
            ]
        );
        
        return response()->json(['result' => true]);
        
    } catch (\Exception $e) {
        return response()->json(['result' => false]);
    }
}
```

---

### Ejemplo 4: Auditoría de calificaciones

```php
public function guardarCalificacion(Request $request)
{
    $auditoria = new MongoAuditoriaService();
    
    try {
        $calificacion = Calificacion::updateOrCreate(
            [
                'estudiante_id' => $request->estudiante_id,
                'materia_id' => $request->materia_id,
                'periodo_id' => $request->periodo_id
            ],
            ['calificacion' => $request->calificacion]
        );
        
        $auditoria->calificacion(
            'INGRESO_NOTA',
            $calificacion->id,
            $request->estudiante_id,
            "Calificación guardada: {$request->calificacion}/10 en {$calificacion->materia->denominacion}",
            [
                'estudiante' => $calificacion->estudiante->persona->nombre_corto,
                'materia' => $calificacion->materia->denominacion,
                'nota' => $request->calificacion
            ]
        );
        
        return response()->json(['result' => true]);
        
    } catch (\Exception $e) {
        return response()->json(['result' => false]);
    }
}
```

---

### Ejemplo 5: Auditoría de configuración

```php
public function actualizarConfiguracion(Request $request)
{
    $auditoria = new MongoAuditoriaService();
    
    try {
        $config = Configuracion::find($request->id);
        $valorAnterior = $config->valor;
        
        $config->update(['valor' => $request->valor]);
        
        $auditoria->configuracion(
            'PARAMETROS_SISTEMA',
            $config->id,
            null,
            "Actualización de configuración '{$config->clave}': {$valorAnterior} → {$request->valor}",
            [
                'clave' => $config->clave,
                'valor_anterior' => $valorAnterior,
                'valor_nuevo' => $request->valor
            ]
        );
        
        return response()->json(['result' => true]);
        
    } catch (\Exception $e) {
        return response()->json(['result' => false]);
    }
}
```

---

## 3️⃣ Métodos Disponibles

### Método Principal
```php
$auditoria->log(
    $tipo,                      // String: ESTUDIANTES, FUNCIONARIOS, etc.
    $subtipo,                   // String|null: MATRICULA, INSCRIPCION, etc.
    $id_referencia_principal,   // int|null: ID principal
    $id_referencia_secundario,  // int|null: ID secundario
    $accion,                    // String: Descripción de la acción
    $detalles                   // Array: Información adicional
);
```

### Shortcuts
```php
// Estudiantes
$auditoria->estudiante($subtipo, $estudiante_id, $id_secundario, $accion, $detalles);

// Funcionarios
$auditoria->funcionario($subtipo, $funcionario_id, $id_secundario, $accion, $detalles);

// Calificaciones
$auditoria->calificacion($subtipo, $calificacion_id, $id_secundario, $accion, $detalles);

// Finanzas
$auditoria->finanzas($subtipo, $transaccion_id, $id_secundario, $accion, $detalles);

// DECE
$auditoria->dece($subtipo, $referencia_id, $id_secundario, $accion, $detalles);

// Configuración
$auditoria->configuracion($subtipo, $referencia_id, $id_secundario, $accion, $detalles);
```

---

## 4️⃣ Tipos y Subtipos Recomendados

### ESTUDIANTES
- `FICHA_ESTUDIANTE` - Actualización de datos personales
- `MATRICULA` - Creación/edición de matrículas
- `INSCRIPCION` - Creación/edición de inscripciones
- `FOTOGRAFIA` - Cambio de foto
- `DIRECCION` - Actualización de dirección
- `FAMILIAR` - Gestión de familiares

### FUNCIONARIOS
- `FICHA_PERSONAL` - Datos personales
- `CONTRATO` - Contratos laborales
- `PERMISO` - Permisos y ausencias
- `HORARIO` - Asignación de horarios

### CALIFICACIONES
- `INGRESO_NOTA` - Ingreso de calificaciones
- `MODIFICACION_NOTA` - Modificación de calificaciones
- `REFUERZO` - Calificaciones de refuerzo
- `EXAMEN` - Calificaciones de exámenes

### FINANZAS
- `PAGO` - Registro de pagos
- `DEUDA` - Gestión de deudas
- `BECA` - Asignación de becas
- `FACTURA` - Generación de facturas

### DECE
- `FORMULARIO` - Formularios dinámicos
- `SEGUIMIENTO` - Seguimientos
- `REMISION` - Remisiones

### CONFIGURACION
- `PARAMETROS_SISTEMA` - Configuraciones globales
- `ROLES` - Gestión de roles
- `PERMISOS` - Gestión de permisos
- `PERIODO` - Gestión de períodos académicos

---

## 5️⃣ Consultar Logs

### Desde el microservicio:

```bash
# Buscar por tipo
curl "http://localhost:3001/logs/search?tipo=ESTUDIANTES&limit=50"

# Buscar por subtipo
curl "http://localhost:3001/logs/search?tipo=ESTUDIANTES&subtipo=MATRICULA"

# Buscar por ID de referencia
curl "http://localhost:3001/logs/search?id_referencia_principal=2707"

# Buscar por autor
curl "http://localhost:3001/logs/search?autor=Edisson"

# Buscar por institución
curl "http://localhost:3001/logs/search?institucion=eu_pasos"

# Buscar por rango de fechas
curl "http://localhost:3001/logs/search?from=2025-01-01&to=2025-12-31"

# Estadísticas
curl "http://localhost:3001/stats"
```

---

## 6️⃣ Estructura del Log en MongoDB

```json
{
    "_id": "507f1f77bcf86cd799439011",
    "fecha": "2025-10-23T15:30:00.000Z",
    "tipo": "ESTUDIANTES",
    "subtipo": "MATRICULA",
    "id_referencia_principal": 2707,
    "id_referencia_secundario": 134,
    "accion": "Creación de Matrícula: 134, Primero de EGB",
    "autor": "Edisson Mendieta",
    "ip": "192.168.10.10",
    "institucion": "eu_pasos",
    "detalles": {
        "periodo": "2025-2026",
        "grado": "Primero de EGB",
        "tipo_matricula": "PRIMERA MATRICULA",
        "url": "https://academicloud.test/estudiantes/gestionv2/matriculas/crear",
        "user_agent": "Mozilla/5.0...",
        "method": "POST"
    },
    "_created_at": "2025-10-23T15:30:00.000Z"
}
```
