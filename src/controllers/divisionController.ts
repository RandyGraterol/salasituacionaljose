import { Request, Response } from 'express';
import Division from '../models/Division';
import Tarea from '../models/Tarea';

// Listar todas las divisiones
export const listarDivisiones = async (req: Request, res: Response) => {
  try {
    const divisiones = await Division.findAll({
      order: [['nombre', 'ASC']],
    });

    res.render('divisiones/index', {
      title: 'Gestión de Divisiones',
      divisiones,
      currentPage: 'divisiones',
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error('Error al listar divisiones:', error);
    res.redirect('/?error=Error al cargar divisiones');
  }
};

// Mostrar formulario de crear división
export const mostrarFormularioCrear = (req: Request, res: Response) => {
  res.render('divisiones/crear', {
    title: 'Crear División',
    currentPage: 'divisiones',
  });
};

// Crear nueva división
export const crearDivision = async (req: Request, res: Response) => {
  try {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.redirect('/divisiones/crear?error=El nombre es requerido');
    }

    // Verificar si ya existe una división con ese nombre
    const divisionExistente = await Division.findOne({
      where: { nombre: nombre.trim() },
    });

    if (divisionExistente) {
      return res.redirect('/divisiones/crear?error=Ya existe una división con ese nombre');
    }

    await Division.create({
      nombre: nombre.trim(),
    });

    res.redirect('/divisiones?success=División creada exitosamente');
  } catch (error) {
    console.error('Error al crear división:', error);
    res.redirect('/divisiones/crear?error=Error al crear la división');
  }
};

// Mostrar formulario de editar división
export const mostrarFormularioEditar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const division = await Division.findByPk(id);

    if (!division) {
      return res.redirect('/divisiones?error=División no encontrada');
    }

    res.render('divisiones/editar', {
      title: 'Editar División',
      division,
      currentPage: 'divisiones',
    });
  } catch (error) {
    console.error('Error al cargar división:', error);
    res.redirect('/divisiones?error=Error al cargar la división');
  }
};

// Actualizar división
export const actualizarDivision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.redirect(`/divisiones/${id}/editar?error=El nombre es requerido`);
    }

    const division = await Division.findByPk(id);

    if (!division) {
      return res.redirect('/divisiones?error=División no encontrada');
    }

    // Verificar si ya existe otra división con ese nombre
    const divisionExistente = await Division.findOne({
      where: { nombre: nombre.trim() },
    });

    if (divisionExistente && divisionExistente.id !== parseInt(id)) {
      return res.redirect(`/divisiones/${id}/editar?error=Ya existe una división con ese nombre`);
    }

    await division.update({
      nombre: nombre.trim(),
    });

    res.redirect('/divisiones?success=División actualizada exitosamente');
  } catch (error) {
    console.error('Error al actualizar división:', error);
    res.redirect(`/divisiones/${req.params.id}/editar?error=Error al actualizar la división`);
  }
};

// Eliminar división
export const eliminarDivision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const division = await Division.findByPk(id);

    if (!division) {
      return res.redirect('/divisiones?error=División no encontrada');
    }

    // Verificar si tiene tareas asociadas
    const tareasAsociadas = await Tarea.count({
      where: { divisionId: id },
    });

    if (tareasAsociadas > 0) {
      return res.redirect('/divisiones?error=No se puede eliminar la división porque tiene tareas asociadas');
    }

    await division.destroy();

    res.redirect('/divisiones?success=División eliminada exitosamente');
  } catch (error) {
    console.error('Error al eliminar división:', error);
    res.redirect('/divisiones?error=Error al eliminar la división');
  }
};
