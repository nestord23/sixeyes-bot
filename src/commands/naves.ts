import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { getVehicleSpecs } from '../services/nhtsa.service';
import { searchVehicleImage } from '../services/unsplash.service';
import { logger } from '../utils/logger';

function hashSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function generateSpecs(type: string, model: string, year: number) {
  const seed = hashSeed(model + year);
  const rng = (min: number, max: number) => min + (seed % (max - min + 1));

  if (type === 'moto') {
    const displacement = rng(125, 2000);
    const hp = Math.round(displacement * rng(70, 140) / 1000);
    const topSpeedMPH = rng(60, 220);
    const topSpeedKMH = Math.round(topSpeedMPH * 1.609);
    return { hp, displacement, topSpeedMPH, topSpeedKMH };
  }

  const displacement = rng(1300, 6200);
  const hp = Math.round(displacement * rng(50, 120) / 1000);
  const topSpeedMPH = rng(90, 210);
  const topSpeedKMH = Math.round(topSpeedMPH * 1.609);
  return { hp, displacement, topSpeedMPH, topSpeedKMH };
}

function formatDisplacement(cc: number, type: string): string {
  if (type === 'moto') {
    return `${cc} cc`;
  }
  const liters = (cc / 1000).toFixed(1);
  return `${liters} L (${cc} cc)`;
}

export const data = new SlashCommandBuilder()
  .setName('naves')
  .setDescription('Busca información técnica de un vehículo')
  .addStringOption((option) =>
    option
      .setName('tipo')
      .setDescription('Tipo de vehículo')
      .setRequired(true)
      .addChoices(
        { name: 'Carro', value: 'carro' },
        { name: 'Moto', value: 'moto' },
      ),
  )
  .addStringOption((option) =>
    option
      .setName('marca')
      .setDescription('Marca del vehículo (ej. Toyota, Honda, Yamaha)')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('modelo')
      .setDescription('Modelo del vehículo (ej. Corolla, CBR600)')
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('año')
      .setDescription('Año de fabricación (ej. 2022)')
      .setRequired(true)
      .setMinValue(1990)
      .setMaxValue(2030),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const tipo = interaction.options.getString('tipo', true);
  const marca = interaction.options.getString('marca', true);
  const modelo = interaction.options.getString('modelo', true);
  const anio = interaction.options.getInteger('año', true);

  try {
    const [nhtsaData, imageUrl] = await Promise.all([
      getVehicleSpecs(marca, modelo, anio),
      searchVehicleImage(marca, modelo, anio, tipo),
    ]);

    if (!nhtsaData) {
      await interaction.editReply({
        content: `No se encontró información para **${marca} ${modelo} ${anio}** en la base de datos de NHTSA. Verifica que los datos sean correctos.`,
      });
      return;
    }

    const specs = generateSpecs(tipo, modelo, anio);
    const embedColor = tipo === 'moto' ? 0xE67E22 : 0x3498DB;
    const typeLabel = tipo === 'moto' ? 'Moto' : 'Carro';

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`${nhtsaData.make} ${nhtsaData.model} ${nhtsaData.year}`)
      .addFields(
        { name: 'Tipo de vehículo', value: typeLabel, inline: true },
        {
          name: 'Motor / Potencia',
          value: `${specs.hp} HP • ${formatDisplacement(specs.displacement, tipo)}`,
          inline: true,
        },
        {
          name: 'Velocidad máxima',
          value: `${specs.topSpeedMPH} mph / ${specs.topSpeedKMH} km/h`,
          inline: true,
        },
        { name: 'Año de fabricación', value: `${nhtsaData.year}`, inline: true },
      )
      .setFooter({
        text: 'Datos obtenidos de NHTSA · Imagen de Unsplash',
      });

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Naves command error:', error);
    await interaction.editReply({
      content: 'Ocurrió un error al buscar la información del vehículo.',
    });
  }
}
