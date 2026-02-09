import { Request, Response } from 'express';
import Municipio from '../models/Municipio';
import Entrega from '../models/Entrega';

// Listar todos los municipios
export const listarMunicipios = async (req: Request, res: Response) => {
  try {
    const municipios = await Municipio.findAll({
      order: [['nombre', 'ASC']],
    });

    res.render('municipios/index', {
      title: 'Gestión de Municipios',
      municipios,
      currentPage: 'municipios',
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error('Error al listar municipios:', error);
    res.redirect('/?error=Error al cargar municipios');
  }
};

// Mostrar formulario de crear municipio
export const mostrarFormularioCrear = (req: Request, res: Response) => {
  res.render('municipios/crear', {
    title: 'Crear Municipio',
    currentPage: 'municipios',
  });
};

// Crear nuevo municipio
export const crearMunicipio = async (req: Request, res: Response) => {
  try {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.redirect('/municipios/crear?error=El nombre es requerido');
    }

    // Verificar si ya existe un municipio con ese nombre
    const municipioExistente = await Municipio.findOne({
      where: { nombre: nombre.trim() },
    });

    if (municipioExistente) {
      return res.redirect('/municipios/crear?error=Ya existe un municipio con ese nombre');
    }

    await Municipio.create({
      nombre: nombre.trim(),
    });

    res.redirect('/municipios?success=Municipio creado exitosamente');
  } catch (error) {
    console.error('Error al crear municipio:', error);
    res.redirect('/municipios/crear?error=Error al crear el municipio');
  }
};

// Mostrar formulario de editar municipio
export const mostrarFormularioEditar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const municipio = await Municipio.findByPk(id);

    if (!municipio) {
      return res.redirect('/municipios?error=Municipio no encontrado');
    }

    res.render('municipios/editar', {
      title: 'Editar Municipio',
      municipio,
      currentPage: 'municipios',
    });
  } catch (error) {
    console.error('Error al cargar municipio:', error);
    res.redirect('/municipios?error=Error al cargar el municipio');
  }
};

// Actualizar municipio
export const actualizarMunicipio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.redirect(`/municipios/${id}/editar?error=El nombre es requerido`);
    }

    const municipio = await Municipio.findByPk(id);

    if (!municipio) {
      return res.redirect('/municipios?error=Municipio no encontrado');
    }

    // Verificar si ya existe otro municipio con ese nombre
    const municipioExistente = await Municipio.findOne({
      where: { nombre: nombre.trim() },
    });

    if (municipioExistente && municipioExistente.id !== parseInt(id)) {
      return res.redirect(`/municipios/${id}/editar?error=Ya existe un municipio con ese nombre`);
    }

    await municipio.update({
      nombre: nombre.trim(),
    });

    res.redirect('/municipios?success=Municipio actualizado exitosamente');
  } catch (error) {
    console.error('Error al actualizar municipio:', error);
    res.redirect(`/municipios/${req.params.id}/editar?error=Error al actualizar el municipio`);
  }
};

// Eliminar municipio
export const eliminarMunicipio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const municipio = await Municipio.findByPk(id);

    if (!municipio) {
      return res.redirect('/municipios?error=Municipio no encontrado');
    }

    // Verificar si tiene entregas asociadas
    const entregasAsociadas = await Entrega.count({
      where: { municipioId: id },
    });

    if (entregasAsociadas > 0) {
      return res.redirect('/municipios?error=No se puede eliminar el municipio porque tiene entregas asociadas');
    }

    await municipio.destroy();

    res.redirect('/municipios?success=Municipio eliminado exitosamente');
  } catch (error) {
    console.error('Error al eliminar municipio:', error);
    res.redirect('/municipios?error=Error al eliminar el municipio');
  }
};
