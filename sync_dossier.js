const fs = require('fs');
const path = require('path');

// Directorio raíz de Hoja de ruta
const baseDir = __dirname;
const indexHtmlPath = path.join(baseDir, 'index.html');

console.log('=== Iniciando Sincronización del Dossier Informativo ===');
console.log('Directorio base:', baseDir);

// 1. Escanear subdirectorios físicos reales de la carpeta Hoja de ruta
function getSubdirectories(source) {
    return fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.') && !dirent.name.startsWith('_'))
        .map(dirent => dirent.name);
}

const folders = getSubdirectories(baseDir);
// Asegurar que la sección 'Planos' se incluya y unificar nombres (evitar duplicados PLANOS vs Planos)
const planosIndex = folders.findIndex(f => f.toLowerCase() === 'planos');
if (planosIndex !== -1) {
    folders[planosIndex] = 'Planos'; // Normalizar a 'Planos' para que coincida con hardcodedDetails
} else if (fs.existsSync(path.join(baseDir, 'PLANOS.lnk'))) {
    folders.push('Planos');
}

// Eliminar duplicados si los hubiera tras la normalización
const uniqueFolders = [...new Set(folders)];
uniqueFolders.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
console.log('Carpetas detectadas y unificadas:', uniqueFolders);

// Función utilitaria para parsear Markdown básico a HTML estilizado con tarjetas premium
function parseMarkdownToHtml(markdown) {
    let lines = markdown.replace(/\r/g, '').split('\n');
    let html = '';
    let inCard = false;
    let inList = false;

    lines.forEach(line => {
        line = line.trim();

        // Ignorar cabeceras # ya que el header se define en index.html dinámicamente
        if (line.startsWith('# ')) {
            return;
        }

        // Títulos de nivel 2 (## Camerinos y Accesos) -> Inicia una nueva tarjeta
        if (line.startsWith('## ')) {
            if (inList) {
                html += '    </ul>\n';
                inList = false;
            }
            if (inCard) {
                html += '</div>\n';
            }
            const titleText = line.substring(3).trim();
            html += `<div class="card">\n    <div class="card-title">${titleText}</div>\n`;
            inCard = true;
            return;
        }

        if (line === '') {
            return;
        }

        // Listas (* o -)
        let isListItem = line.startsWith('* ') || line.startsWith('- ');
        if (isListItem) {
            if (!inList) {
                html += '    <ul style="list-style: disc; padding-left: 20px; font-size: 14px; color: var(--text-main); margin-bottom: 10px;">\n';
                inList = true;
            }
            let listContent = line.substring(2).trim();
            listContent = parseInlineMarkdown(listContent);
            html += `        <li style="margin-bottom: 8px;">${listContent}</li>\n`;
        } else {
            if (inList) {
                html += '    </ul>\n';
                inList = false;
            }
            let paraContent = parseInlineMarkdown(line);
            if (inCard) {
                html += `    <p style="font-size: 14px; line-height: 1.6; margin-bottom: 12px; color: var(--text-main);">${paraContent}</p>\n`;
            } else {
                html += `<div class="card">\n    <p style="font-size: 14px; line-height: 1.6; margin-bottom: 12px; color: var(--text-main);">${paraContent}</p>\n</div>\n`;
                inCard = true;
            }
        }
    });

    if (inList) {
        html += '    </ul>\n';
    }
    if (inCard) {
        html += '</div>\n';
    }

    return html;
}

function parseInlineMarkdown(text) {
    // Convertir negrita **texto** a <strong>texto</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convertir enlaces markdown [Texto](Enlace) o [Texto](#ancla)
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
        if (url.startsWith('#')) {
            const tabId = url.substring(1).toLowerCase();
            return `<a onclick="switchTab('${tabId}')" style="color: var(--accent-blue); cursor: pointer; text-decoration: underline; font-weight: 600;">${linkText}</a>`;
        }
        return `<a href="${url}" target="_blank" style="color: var(--accent-blue); text-decoration: underline; font-weight: 600;">${linkText}</a>`;
    });
    
    return text;
}

// 2. Escanear archivos en una subcarpeta
function getFilesOfFolder(folderName) {
    const folderPath = path.join(baseDir, folderName);
    if (!fs.existsSync(folderPath)) return [];
    
    return fs.readdirSync(folderPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name !== 'desktop.ini')
        .map(dirent => {
            const filePath = path.join(folderPath, dirent.name);
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            const ext = path.extname(dirent.name).toUpperCase().replace('.', '');
            
            // Generar link local relativo compatible con la web
            const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
            
            return {
                name: dirent.name,
                ext: ext || 'FILE',
                size: sizeKB + ' KB',
                modified: stats.mtime.toLocaleDateString('es-ES') + ' ' + stats.mtime.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'}),
                link: relativePath
            };
        });
}

// 3. Mapear datos estáticos fidedignos de ZETAK y San Mamés que ya analizamos
// de forma que se integren armoniosamente con los archivos en caliente.
const hardcodedDetails = {
    'Artista': `
        <div class="card">
            <div class="card-title">🎤 ZETAK - Folk Electrónica Vasco</div>
            <p><strong>ZETAK</strong> es el aclamado proyecto musical liderado por <strong>Pello Reparaz</strong> (Arbizu, Navarra) que fusiona la música tradicional vasca en euskera con electrónica contemporánea, pop y ritmos urbanos de vanguardia. La puesta en escena para San Mamés ("Mitoaroa III") representa el montaje escénico más grande de su trayectoria.</p>
            <p style="margin-top: 15px;"><strong style="color: var(--accent-blue);">Contacto Artístico:</strong> Patricia Lorenzo García (lorenzogarciapatricia@gmail.com | 665728312)</p>
        </div>
        <div class="card">
            <div class="card-title">⏱️ Agenda de Conciertos y Show Days</div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Horario Inicio</th>
                            <th>Horario Fin</th>
                            <th>Actividad / Detalle</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>16/06/2026</td><td>21:10</td><td>05:00</td><td>Programación de iluminación del show en el escenario del estadio.</td></tr>
                        <tr><td>17/06/2026</td><td>10:00</td><td>18:00</td><td>Ensayos técnicos y pruebas acústicas de la banda.</td></tr>
                        <tr><td>18/06/2026</td><td>15:00</td><td>00:00</td><td>Ensayo general con escenografía, pirotecnia y drones (horario nocturno).</td></tr>
                        <tr><td><strong>19/06/2026</strong></td><td>20:30</td><td>22:30</td><td>Apertura de Puertas (Show 1)</td></tr>
                        <tr><td><strong>19/06/2026</strong></td><td><strong>22:30</strong></td><td><strong>01:15</strong></td><td><strong>ACTUACIÓN DE ZETAK (Concierto Día 1)</strong></td></tr>
                        <tr><td><strong>20/06/2026</strong></td><td>20:00</td><td>22:00</td><td>Apertura de Puertas (Show 2 - Show Principal)</td></tr>
                        <tr><td><strong>20/06/2026</strong></td><td><strong>22:00</strong></td><td><strong>23:30</strong></td><td><strong>ACTUACIÓN DE ZETAK (Concierto Día 2 - Cierre)</strong></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
    'Contactos': `
        <div class="card">
            <div class="card-title">📞 Directorio del Staff por Jornadas de Trabajo</div>
            <div class="contact-grid">
                <a href="tel:+34610019415" class="contact-item">
                    <span class="contact-name">Wero Edge</span>
                    <span class="contact-role">Director Técnico</span>
                    <span class="contact-info">📧 weroedge@hotmail.com / wero@vansandroll.com<br>📱 +34 610 019 415</span>
                    <span class="badge blue" style="width:fit-content; margin-top:5px;">08 al 20 de Junio</span>
                </a>
                <a href="mailto:ines@stormproductions.pt" class="contact-item">
                    <span class="contact-name">Inés Pires</span>
                    <span class="contact-role">Asistente Infraestructuras | Storm</span>
                    <span class="contact-info">📧 ines@stormproductions.pt</span>
                    <span class="badge blue" style="width:fit-content; margin-top:5px;">13 al 21 de Junio</span>
                </a>
                <a href="mailto:dcalvo@tecproin.es" class="contact-item">
                    <span class="contact-name">Daniel Calvo</span>
                    <span class="contact-role">Ingeniero Técnico | Tecproin</span>
                    <span class="contact-info">📧 dcalvo@tecproin.es</span>
                    <span class="badge blue" style="width:fit-content; margin-top:5px;">12 al 20 de Junio</span>
                </a>
                <a href="mailto:francisco.ribeiro@stormproductions.pt" class="contact-item">
                    <span class="contact-name">Francisco José Gomes Ribeiro</span>
                    <span class="contact-role">CEO | Storm Productions</span>
                    <span class="contact-info">📧 francisco.ribeiro@stormproductions.pt</span>
                    <span class="badge blue" style="width:fit-content; margin-top:5px;">13 al 22 de Junio</span>
                </a>
                <a href="mailto:jordibruguesgi@gmail.com" class="contact-item">
                    <span class="contact-name">Jordi Brugués</span>
                    <span class="contact-role">Ingeniero de Sonido Principal</span>
                    <span class="contact-info">📧 jordibruguesgi@gmail.com</span>
                    <span class="badge blue" style="width:fit-content; margin-top:5px;">14 al 20 de Junio</span>
                </a>
                <a href="mailto:logistika@udv.eus" class="contact-item">
                    <span class="contact-name">Maddi</span>
                    <span class="contact-role">Coordinadora Logística | Undenvi</span>
                    <span class="contact-info">📧 logistika@udv.eus</span>
                    <span class="badge blue" style="width:fit-content; margin-top:5px;">14 al 20 de Junio</span>
                </a>
                <a href="mailto:manelrubio@econsultoring.com" class="contact-item">
                    <span class="contact-name">Manel Rubio</span>
                    <span class="contact-role">Director de Seguridad | EConsulting</span>
                    <span class="contact-info">📧 manelrubio@econsultoring.com</span>
                    <span class="badge blue" style="width:fit-content; margin-top:5px;">17 al 19 de Junio</span>
                </a>
                <a href="mailto:produccion@xavipayan.com" class="contact-item">
                    <span class="contact-name">Xavi Payán</span>
                    <span class="contact-role">Coordinador Hospitalidad y Catering</span>
                    <span class="contact-info">📧 produccion@xavipayan.com</span>
                    <span class="badge blue" style="width:fit-content; margin-top:5px;">13 al 20 de Junio</span>
                </a>
                <a href="mailto:jaumepique@gmail.com" class="contact-item">
                    <span class="contact-name">Jaume Pique</span>
                    <span class="contact-role">Asist Prod Manager | Freelance</span>
                    <span class="contact-info">📧 jaumepique@gmail.com</span>
                    <span class="badge blue" style="width:fit-content; margin-top:5px;">17 al 22 de Junio</span>
                </a>
            </div>
        </div>
        <div class="card">
            <div class="card-title">🏟️ Contactos Oficiales del Estadio San Mamés</div>
            <div class="contact-grid">
                <a href="tel:+34946852440" class="contact-item" style="border-color: rgba(129, 140, 248, 0.3);">
                    <span class="contact-name" style="color: var(--accent-purple);">José Arroyo Fernández</span>
                    <span class="contact-role" style="color: var(--text-main);">Responsable de Mantenimiento e Instalaciones</span>
                    <span class="contact-info">📱 Tel: +34 946 852 440</span>
                </a>
                <a href="tel:+34946854180" class="contact-item" style="border-color: rgba(129, 140, 248, 0.3);">
                    <span class="contact-name" style="color: var(--accent-purple);">Nerea Ortiz de Pinedo</span>
                    <span class="contact-role" style="color: var(--text-main);">Responsable de Operaciones y Eventos</span>
                    <span class="contact-info">📱 Tel: +34 946 854 180</span>
                </a>
            </div>
        </div>
    `,
    'Escenario': `
        <div class="card">
            <div class="card-title">📐 Especificaciones Técnicas del Escenario (STG03)</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                <div>
                    <p style="margin-bottom: 8px;"><strong style="color: var(--accent-blue);">Estructura Principal:</strong></p>
                    <ul style="list-style: none; padding-left: 0; font-size: 14px; color: var(--text-main);">
                        <li style="margin-bottom: 5px;">🏗️ <strong>Tipo:</strong> Torres de alta capacidad (STG Roof 03 - StageTec).</li>
                        <li style="margin-bottom: 5px;">📏 <strong>Planchada:</strong> 18 m (ancho) x 11 m (fondo).</li>
                        <li style="margin-bottom: 5px;">↕️ <strong>Clearance:</strong> 15 metros libres.</li>
                        <li style="margin-bottom: 5px;">🔝 <strong>Altura Total:</strong> 17 metros (Deck to Grid).</li>
                    </ul>
                </div>
                <div>
                    <p style="margin-bottom: 8px;"><strong style="color: var(--accent-blue);">Extensiones (Wings):</strong></p>
                    <ul style="list-style: none; padding-left: 0; font-size: 14px; color: var(--text-main);">
                        <li style="margin-bottom: 5px;">⬅️ <strong>SL (Izquierda):</strong> Pasarela frontal (18x2,5m) + Ala soporte (18x5m).</li>
                        <li style="margin-bottom: 5px;">➡️ <strong>SR (Derecha):</strong> Pasarela frontal (18x2,5m) + Muelle carga (4x9m).</li>
                        <li style="margin-bottom: 5px;">🎭 <strong>Risings:</strong> Anfiteatro Layher + Tarimas integradas.</li>
                        <li style="margin-bottom: 5px;">🪜 <strong>Escaleras:</strong> 2 traseras + frontales de pasarela.</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">🗺️ Plano de Implantación del Escenario</div>
            <p style="font-size: 14px; margin-bottom: 15px; color: var(--text-muted);">Vista técnica horizontal (ZETAK Implantacion FINAL 2105):</p>
            
            <div style="width: 100%; height: 500px; position: relative; overflow: hidden; border-radius: 8px; border: 1px solid var(--border-light); background: #2a2a2e;">
                <iframe src="Escenario/ZETAK%20Implantacion%20FINAL%202105-Stage.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH" 
                        style="width: 100%; height: 100%; border: none;">
                </iframe>
            </div>
            
            <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                <span style="font-size: 12px; color: var(--text-muted); align-self: center;">⚠️ El visor puede variar según el navegador.</span>
                <a href="Escenario/ZETAK%20Implantacion%20FINAL%202105-Stage.pdf" target="_blank" class="badge blue" style="text-decoration: none; padding: 8px 15px;">🔍 Abrir plano original</a>
            </div>
        </div>

        <div class="card">
            <div class="card-title">🔌 Distribución de Energía y Potencia Eléctrica</div>
            <p style="font-size: 14px; margin-bottom: 15px;">Acometidas de fuerza y tomas técnicas confirmadas según <span class="badge blue">Plano de Electricidad (ZETAK 2105)</span>:</p>
            <div class="contact-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
                <div class="contact-item" style="padding: 12px; background: rgba(56, 189, 248, 0.03);">
                    <strong style="color: var(--accent-blue);">🔊 Audio P.A.</strong><br>
                    <span style="font-size: 13px;">2x 300 KVAs (Independientes)</span>
                </div>
                <div class="contact-item" style="padding: 12px; background: rgba(56, 189, 248, 0.03);">
                    <strong style="color: var(--accent-blue);">💡 Iluminación</strong><br>
                    <span style="font-size: 13px;">2x 4 KVAs (Auxiliar FOH)</span>
                </div>
                <div class="contact-item" style="padding: 12px; background: rgba(56, 189, 248, 0.03);">
                    <strong style="color: var(--accent-blue);">📺 Vídeo y LED</strong><br>
                    <span style="font-size: 13px;">2x 300 KVAs</span>
                </div>
                <div class="contact-item" style="padding: 12px; background: rgba(56, 189, 248, 0.03);">
                    <strong style="color: var(--accent-blue);">🏗️ Stage Power</strong><br>
                    <span style="font-size: 13px;">2x 32A (Centro / Abajo Escenario)</span>
                </div>
                <div class="contact-item" style="padding: 12px; background: rgba(56, 189, 248, 0.03);">
                    <strong style="color: var(--accent-blue);">🎆 FX Pyro</strong><br>
                    <span style="font-size: 13px;">2x 32A (Escenario / Centro)</span>
                </div>
                <div class="contact-item" style="padding: 12px; background: rgba(56, 189, 248, 0.03);">
                    <strong style="color: var(--accent-blue);">🍽️ Catering</strong><br>
                    <span style="font-size: 13px;">2x 32A (Cocina Producción)</span>
                </div>
                <div class="contact-item" style="padding: 12px; background: rgba(56, 189, 248, 0.03);">
                    <strong style="color: var(--accent-blue);">🔌 Distribución</strong><br>
                    <span style="font-size: 13px;">6x Distribuidor 63A</span>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">🔊 Equipamiento de Sonido (P.A. & FOH)</div>
            <p style="font-size: 14px; margin-bottom: 15px;">Sistema <span class="badge blue">d&b audiotechnik</span> suministrado por <span class="badge blue">Fluge</span>:</p>
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 15px; margin-bottom: 15px;">
                <p style="margin-bottom: 5px;"><strong style="color: var(--accent-blue);">P.A. Principal:</strong></p>
                <span style="font-size: 14px;">32x d&b GSL8 (voladas) + 30x Amplificadores d&b D-80.</span>
            </div>
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 15px; margin-bottom: 15px;">
                <p style="margin-bottom: 5px;"><strong style="color: var(--accent-blue);">Subgraves (Subs):</strong></p>
                <span style="font-size: 14px;">12x d&b SL-SUB (cardioides volados) + 16x d&b SL-SUB (apoyados en pista).</span>
            </div>
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 15px;">
                <p style="margin-bottom: 5px;"><strong style="color: var(--accent-blue);">Outfills & Delays:</strong></p>
                <span style="font-size: 14px;">32x d&b GSL8 (outfill) + 40x d&b KSL8/12 (retraso/delay).</span>
            </div>
        </div>

        <div class="card">
            <div class="card-title">💡 Equipamiento de Iluminación (Luminarias & Control)</div>
            <p style="font-size: 14px; margin-bottom: 15px;">Diseño de iluminación suministrado por <span class="badge blue">Fluge</span>:</p>
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 15px; margin-bottom: 15px;">
                <p style="margin-bottom: 5px;"><strong style="color: var(--accent-blue);">Luminarias Móviles (Moving Heads):</strong></p>
                <ul style="list-style: none; padding-left: 0; font-size: 14px;">
                    <li>• <strong>69x</strong> Robe iForte LED TE 1000W (Spot Frontal IP65)</li>
                    <li>• <strong>24x</strong> Robe iSpiiderX IP65 (Wash/Beam)</li>
                    <li>• <strong>30x</strong> Robe Tarrantula LED Beam/Wash</li>
                    <li>• <strong>40x</strong> Robe LED Beam 350</li>
                    <li>• <strong>38x</strong> Robe Tetra 2 (Barras móviles)</li>
                    <li>• <strong>12x</strong> Robe iForte LTX (Controlados por RoboSpot)</li>
                </ul>
            </div>
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 15px; margin-bottom: 15px;">
                <p style="margin-bottom: 5px;"><strong style="color: var(--accent-blue);">Iluminación Estática, FX y Seguimiento:</strong></p>
                <ul style="list-style: none; padding-left: 0; font-size: 14px;">
                    <li>• <strong>72x</strong> SGM Q8 Flood Strobe</li>
                    <li>• <strong>145x</strong> GLP Impression X4 Bar 20</li>
                    <li>• <strong>40x</strong> GLP JDC 1 (Hybrid Strobe)</li>
                    <li>• <strong>16x</strong> Astera Titan Tube</li>
                    <li>• <strong>5x</strong> RoboSpot Base Station + Camera Set</li>
                    <li>• <strong>20x</strong> Robe HZ500 Máquinas de humo</li>
                </ul>
            </div>
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 15px;">
                <p style="margin-bottom: 5px;"><strong style="color: var(--accent-blue);">Control y Red:</strong></p>
                <span style="font-size: 14px;"><strong>2x</strong> Chamsys MagicQ MQ500 (Master/Backup) + <strong>2x</strong> Chamsys MQ70 (Auxiliar/Compact) + Nodos Luminex Gigacore.</span>
            </div>
        </div>

        <div class="card">
            <div class="card-title">📺 Equipamiento de Vídeo (Pantallas & Servidores)</div>
            <p style="font-size: 14px; margin-bottom: 15px;">Sistema visual gestionado por <span class="badge blue">Fluge</span> y <span class="badge blue">Eyesberg</span>:</p>
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 15px; margin-bottom: 15px;">
                <p style="margin-bottom: 5px;"><strong style="color: var(--accent-blue);">Pantallas LED (P3.9 Outdoor):</strong></p>
                <ul style="list-style: none; padding-left: 0; font-size: 14px;">
                    <li>• <strong>2x</strong> Pantallas P3.9 Blackface (18.000 x 10.000 mm)</li>
                    <li>• <strong>1x</strong> Pantalla P3.9 Vanish (18.000 x 10.000 mm)</li>
                    <li>• <strong>54x</strong> Bumpers Dicolor + Estructuras de volado</li>
                </ul>
            </div>
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 15px; margin-bottom: 15px;">
                <p style="margin-bottom: 5px;"><strong style="color: var(--accent-blue);">Servidores y Procesamiento:</strong></p>
                <span style="font-size: 14px;"><strong>3x</strong> Procesadores NovaStar H5 + Servidores de medios Eyesberg + <strong>6x</strong> Conversores Fibra-SDI.</span>
            </div>
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 15px;">
                <p style="margin-bottom: 5px;"><strong style="color: var(--accent-blue);">Realización y Captación:</strong></p>
                <span style="font-size: 14px;">Sistema de cámaras 4K Toboggan + <strong>2x</strong> Decimator + Controles de realización en Sala Audiovisuales.</span>
            </div>
        </div>
    `,
    'Horarios': `
        <div class="card">
            <div class="card-title">⏱️ Planificación Horaria de la Producción (Día a Día)</div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha (Jornada)</th>
                            <th>Horario</th>
                            <th>Operación / Tarea</th>
                            <th>Proveedor Responsable</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background-color: rgba(56, 189, 248, 0.03);">
                            <td><strong>15/06/2026 (Día 8)</strong></td>
                            <td>08:00 - 21:00<br>10:00 - 21:00<br>12:00 - 16:00</td>
                            <td>Montaje de sonido, luces y pantallas LED de ZETAK.<br>Montaje de cañones pirotécnicos en provocador y frontal.<br>Montaje e ingeniería de la plataforma variable en pasarela.</td>
                            <td>Fluge Euskadi S.L.<br>Sukubo S.L.<br>Pascualin Estructures</td>
                        </tr>
                        <tr style="background-color: rgba(46, 204, 113, 0.08);">
                            <td><strong>19/06/2026 (Día 12)</strong></td>
                            <td>20:30 - 22:30<br><strong>22:30 - 01:15</strong></td>
                            <td>Apertura de puertas de público.<br><strong>EJECUCIÓN DÍA 1 DE CONCIERTO ZETAK (MITOAROA III)</strong></td>
                            <td>Sureuskadi / Vans & Roll<br><strong>ZETAK / Vans & Roll</strong></td>
                        </tr>
                        <tr style="background-color: rgba(46, 204, 113, 0.08);">
                            <td><strong>20/06/2026 (Día 13)</strong></td>
                            <td>20:00 - 22:00<br><strong>22:00 - 23:30</strong></td>
                            <td>Apertura de puertas (Show Principal).<br><strong>EJECUCIÓN DÍA 2 DE CONCIERTO ZETAK (MITOAROA III)</strong></td>
                            <td>Sureuskadi / Vans & Roll<br><strong>ZETAK / Vans & Roll</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
    'Proveedores': `
        <div class="card">
            <div class="card-title">🤝 Guía de Proveedores Oficiales del Show</div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre Comercial</th>
                            <th>Servicio / Categoría</th>
                            <th>Persona de Contacto</th>
                            <th>Correo Electrónico</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td><strong>Fluge Euskadi S.L.</strong></td><td>Audiovisuales (Luz, Sonido, Video)</td><td>Técnico de Cuenta</td><td>prodeuskadi@fluge.es</td></tr>
                        <tr><td><strong>General de Alquiler de Maquinaria (GAM)</strong></td><td>Escaleras, Provocadores y Andamios</td><td>Rubén Lombardero</td><td>rlombardero@gamrentals.com</td></tr>
                        <tr><td><strong>Penny Norte S.L. (Pennywise)</strong></td><td>Personal Auxiliar y Rigging</td><td>Ixone Pennywise (PM)</td><td>norte@grupopennywise.com</td></tr>
                        <tr><td><strong>Mojo Rental B.V.</strong></td><td>Estructuras de protección de Suelo</td><td>Bart Van Middelkoop</td><td>bart.vanmiddelkoop.mojorental.com</td></tr>
                        <tr><td><strong>Pereto Power</strong></td><td>Fuerza y Generadores</td><td>Área de Ingeniería</td><td>ingenieria@pereto.es</td></tr>
                        <tr><td><strong>StageTec Portugal</strong></td><td>Montaje de Escenario</td><td>Pedro Lopes</td><td>pedro.lopes@stagetec.pt</td></tr>
                        <tr><td><strong>Cuchara de Palo, S.L.</strong></td><td>Catering y Comedor de Staff</td><td>Gonzaga Martínez</td><td>gonzaga@cucharadepalo.cooking</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
    'Emails': `
        <div class="card">
            <div class="card-title">📧 Historial de Peticiones y Respuestas de Producción (Patri)</div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha Petición</th>
                            <th>Solicitante</th>
                            <th>Solicitud / Detalle</th>
                            <th>Fecha Respuesta</th>
                            <th>Respuesta por:</th>
                            <th>Desarrollo de la Respuesta</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="status-green"><td>16/01/2026</td><td>Wero</td><td>Confirmar Layher y torres escenario.</td><td>19/01/2026</td><td>Isabel</td><td>Cambiar escenario por backdrop. Aprobado.</td><td><span class="badge green">Solucionada</span></td></tr>
                        <tr class="status-green"><td>23/01/2026</td><td>Isabel</td><td>Propuesta de 3 tipos de pantallas.</td><td>23/01/2026</td><td>Wero</td><td>Aprobado si no invade evacuación.</td><td><span class="badge green">Solucionada</span></td></tr>
                        <tr class="status-green"><td>27/01/2026</td><td>Wero</td><td>Fotos cubrimiento de gradas (TNT).</td><td>27/01/2026</td><td>Patri</td><td>Confirmado 4 primeras filas con TNT.</td><td><span class="badge green">Solucionada</span></td></tr>
                        <tr class="status-green"><td>17/03/2026</td><td>Jordi</td><td>Pide simulación de luces (**WYSI**).</td><td>26/03/2026</td><td>Patri</td><td>Entregado con retraso el 6 de abril.</td><td><span class="badge green">Solucionada</span></td></tr>
                        <tr class="status-orange"><td>13/05/2026</td><td>Wero</td><td>Pide urgente documentos CAE de AENA.</td><td>13/05/2026</td><td>Patri</td><td>Demoras de proveedores de drones.</td><td><span class="badge orange">Urgente</span></td></tr>
                        <tr class="status-red"><td>14/05/2026</td><td>Patri</td><td>Propone montar tarimas el día 15.</td><td>15/05/2026</td><td>Wero</td><td>Denegado. Certificaciones en días cruzados.</td><td><span class="badge red">Denegada</span></td></tr>
                        <tr class="status-orange"><td>28/05/2026</td><td>Patri</td><td>"Trompas" se niegan a subir escaleras.</td><td>-</td><td>-</td><td>Pide rehacer escaleras como Mitoaroa I.</td><td><span class="badge orange">Pendiente Crítico</span></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
    'Parking': `
        <div class="card">
            <div class="card-title">🅿️ Normativas de Estacionamiento y Parking</div>
            <p><strong>Gestión Operativa:</strong> San Mamés dispone de un riguroso protocolo de aparcamiento para evitar colapsos en las inmediaciones y garantizar las vías de evacuación en caso de emergencia.</p>
            <div class="alert-box" style="margin-top: 15px; border-left: 5px solid var(--warning); background-color: rgba(241, 196, 15, 0.05); border-color: rgba(241, 196, 15, 0.3);">
                <h4 style="color: #f4d03f;">📌 Instrucciones Críticas de Tránsito</h4>
                <p>1. Solo serán admitidos en el <strong>parking interior</strong> del estadio los vehículos con su autorización explícita y acreditada para el día exacto de montaje y desmontaje.</p>
                <p style="margin-top: 10px;">2. Los vehículos personales del equipo de trabajo, personal de producción, proveedores y artistas deberán estacionar exclusivamente en el <strong>parking exterior habilitado</strong>, previa confirmación y asignación de plaza por el departamento de logística y operaciones de Vans & Roll.</p>
            </div>
        </div>
    `,
    'Planos': `
        <div class="card">
            <div class="card-title">🗺️ Repositorio de Planos (Documentación PDF)</div>
            <p style="font-size: 14px; color: var(--text-muted);">Acceso exclusivo a la planimetría final aprobada para la producción en San Mamés.</p>
        </div>
        <div class="contact-grid">
            <div class="card" style="margin-top: 0;">
                <h4 style="margin-top:0; color: var(--accent-blue);">📍 Implantación y Accesos</h4>
                <ul style="list-style: none; padding-left: 0; font-size: 14px; color: var(--text-main);">
                    <li style="margin-bottom: 12px;">
                        <strong>Acceso Personal (Vial):</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Implantacion%20(Acceso%20personal).pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                    <li style="margin-bottom: 12px;">
                        <strong>Accesos Generales:</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Implantacion%20(Accesos).pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                    <li style="margin-bottom: 12px;">
                        <strong>Implantación Exterior:</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Implantacion%20Exterior.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                    <li style="margin-bottom: 12px;">
                        <strong>Flujos de Público:</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Flujos.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                </ul>
            </div>
            <div class="card" style="margin-top: 0;">
                <h4 style="margin-top:0; color: var(--accent-blue);">🏗️ Escenario y Técnica</h4>
                <ul style="list-style: none; padding-left: 0; font-size: 14px; color: var(--text-main);">
                    <li style="margin-bottom: 12px;">
                        <strong>Plano Stage (ZETAK):</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Stage.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                    <li style="margin-bottom: 12px;">
                        <strong>Instalación Eléctrica:</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Electricidad.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                    <li style="margin-bottom: 12px;">
                        <strong>Cámaras y Realización:</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Camaras.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                    <li style="margin-bottom: 12px;">
                        <strong>Efectos Especiales (FX):</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-FX.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                </ul>
            </div>
            <div class="card" style="margin-top: 0;">
                <h4 style="margin-top:0; color: var(--accent-blue);">🏟️ Recinto y Otros</h4>
                <ul style="list-style: none; padding-left: 0; font-size: 14px; color: var(--text-main);">
                    <li style="margin-bottom: 12px;">
                        <strong>Vallados y Seguridad:</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Vallados.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                    <li style="margin-bottom: 12px;">
                        <strong>Sitting Plan (Asientos):</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Asientos.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                    <li style="margin-bottom: 12px;">
                        <strong>Merchandising:</strong><br>
                        <a href="./Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-MERCH.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                    <li style="margin-bottom: 12px;">
                        <strong>Evento EHU (Stage):</strong><br>
                        <a href="./Planos/PDFs/EHU%20Implantacion%20FINAL%202105-Stage.pdf" target="_blank" class="badge blue" style="text-decoration: none; margin-top:5px; display:inline-block;">Ver PDF</a>
                    </li>
                </ul>
            </div>
        </div>
    `
};

// 4. Generar elementos HTML de Navegación (Items del menú)
let navHtml = `<div class="nav-item active" onclick="switchTab('inicio')">Introducción y bienvenida</div>\n`;
folders.forEach(folder => {
    let emoji = '📁';
    let displayName = folder;
    if (folder === 'Artista') { emoji = '🎤'; displayName = 'Ficha del Artista'; }
    else if (folder === 'Contactos') { emoji = '📞'; displayName = 'Contactos y Staff'; }
    else if (folder === 'Emails') { emoji = '📧'; displayName = 'Emails'; }
    else if (folder === 'Escenario') { emoji = '📐'; displayName = 'Ficha Técnica Escenario'; }
    else if (folder === 'Horarios') { emoji = '⏱️'; displayName = 'Cronograma Horario'; }
    else if (folder === 'Planos') { emoji = '🗺️'; displayName = 'Planos Técnicos'; }
    else if (folder === 'Proveedores') { emoji = '🤝'; displayName = 'Guía de Proveedores'; }
    else if (folder === 'Contratos') { emoji = '📄'; displayName = 'Contratos'; }
    else if (folder === 'Seguridad') { emoji = '🛡️'; displayName = 'Seguridad'; }
    else if (folder === 'Parking') { emoji = '🅿️'; displayName = 'Parking y Tránsito'; }
    else if (folder === 'Hospitalidad') { emoji = '🛎️'; displayName = 'Hospitalidad'; }
    else if (folder === 'Logistica') { emoji = '🚚'; displayName = 'Logística'; }
    
    navHtml += `            <div class="nav-item" onclick="switchTab('${folder.toLowerCase()}')">${emoji} ${displayName}</div>\n`;
});

// 5. Generar paneles de contenido HTML para cada subcarpeta
let panelsHtml = '';

// Añadir panel de bienvenida fijo
panelsHtml += `
        <!-- TAB: INICIO / BIENVENIDA -->
        <div id="tab-inicio" class="tab-panel active">
            <div class="welcome-grid">
                <div class="welcome-hero">
                    <h3>¡Bienvenido al Equipo de Producción de San Mamés!</h3>
                    <p>Estás integrado en la producción técnica y de logística para los espectáculos en directo de <strong>ZETAK</strong> en el Estadio San Mamés (Bilbao).</p>
                    <p>Este dossier centraliza toda la información técnica, planos, contactos y horarios aprobados para que dispongas de una introducción rápida y puedas operar de forma segura y coordinada en el recinto.</p>
                    
                    <div class="alert-box">
                        <h4>🚨 REGLA CRÍTICA DE ACCESO (LOGÍSTICA)</h4>
                        <p>Tanto el personal técnico, artistas, staff local, como la totalidad del transporte de mercancías, carga y descarga tienen un <strong>único punto de acceso oficial y obligatorio</strong> al estadio:</p>
                        <p style="margin-top: 10px; font-weight: 600; color: #fff;">📍 Túnel de Mercancías - Ubicado exclusivamente en la Calle Ventosa.</p>
                        <p style="font-size: 13px; color: var(--text-muted); margin-top: 5px;">Será obligatorio presentar DNI en el primer acceso para poder acreditarse; si la documentación aportada no ha sido aprobada previamente, el acceso será denegado. No se autorizará el ingreso de personal por las puertas de público del estadio.</p>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 0;">
                    <h4 style="margin-top:0; color: var(--accent-blue);">📌 Puntos Clave del Evento</h4>
                    <p style="font-size:14px; margin: 10px 0;"><strong style="color:var(--text-muted)">Fechas del Show:</strong><br> Viernes 19 y Sábado 20 de Junio de 2026</p>
                    <p style="font-size:14px; margin: 10px 0;"><strong style="color:var(--text-muted)">Aforo Máximo Estimado:</strong><br> 40.000 pax aprox por jornada</p>
                    <p style="font-size:14px; margin: 10px 0;"><strong style="color:var(--text-muted)">Ubicación de Oficinas:</strong><br> Sala de audiovisuales (entrada por la puerta de la derecha justo antes de salir al campo por el túnel de acceso).</p>
                    <p style="font-size:14px; margin: 10px 0;"><strong style="color:var(--text-muted)">Normativa de Seguridad:</strong><br> Casco, calzado de seguridad y chaleco reflectante obligatorios (EPIS) durante todas las fases de montaje y desmontaje en campo.</p>
                    
                    <div style="margin-top: 20px;">
                        <p style="font-size: 13px; color: var(--accent-blue); margin-bottom: 10px; font-weight: 600;">🗺️ Plano de Accesos y Zonas Prohibidas:</p>
                        <div style="width: 100%; aspect-ratio: 1.414; position: relative; overflow: hidden; border-radius: 8px; border: 1px solid var(--border-light); background: #2a2a2e;">
                            <iframe src="Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Implantacion%20(Acceso%20personal).pdf#toolbar=0&navpanes=0&scrollbar=0" 
                                    style="width: 100%; height: 100%; border: none;">
                            </iframe>
                        </div>
                        <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
                            <a href="Planos/PDFs/ZETAK%20Implantacion%20FINAL%202105-Implantacion%20(Acceso%20personal).pdf" target="_blank" class="badge blue" style="text-decoration: none; font-size: 11px;">🔍 Ampliar plano de accesos</a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 30px;">
                <div class="card-title">❓ Preguntas Frecuentes (FAQ Básica)</div>
                
                <div class="faq-item">
                    <div class="faq-trigger" onclick="toggleFaq(this)">¿Dónde y cómo recojo mi acreditación? <span>➕</span></div>
                    <div class="faq-content">La pulsera o pase de acreditación se puede recoger en el punto de control del túnel de mercancías después de haber mostrado el DNI y certificar que se es apto para el acceso tras la validación de la documentación en la plataforma CAE.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-trigger" onclick="toggleFaq(this)">¿Cómo funciona el catering y comedor? <span>➕</span></div>
                    <div class="faq-content">El catering oficial de la producción está gestionado por <strong>Cuchara de Palo</strong>. Se ha habilitado una zona de comedor interior en la planta cero del estadio justo detrás del escenario en la parte este. Los horarios de servicio son de 13:00 a 16:00 (comida) y de 20:00 a 23:00 (cena), accesibles únicamente con ticket el cual, si te aplica, te dará tu responsable de equipo.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-trigger" onclick="toggleFaq(this)">¿Tengo un espacio donde dejar mis cosas? <span>➕</span></div>
                    <div class="faq-content">Dirígete a tu responsable de equipo para que te diga dónde está el espacio asignado para dejar tus pertenencias personales.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-trigger" onclick="toggleFaq(this)">¿Puedo llevar mi vehículo? <span>➕</span></div>
                    <div class="faq-content">Lamentablemente las plazas de aparcamiento son limitadas, así que si no has recibido confirmación de poder aparcar dentro del estadio, puedes usar los parkings públicos de la zona como el del Intermodal.</div>
                </div>
            </div>
        </div>
`;

// Generar paneles dinámicos
folders.forEach(folder => {
    // Buscar si existe un archivo Markdown (.md) dentro del subdirectorio físico de la pestaña
    const folderPath = path.join(baseDir, folder);
    let mdFilePath = '';
    try {
        const files = fs.readdirSync(folderPath);
        const mdFile = files.find(f => f.toLowerCase().endsWith('.md'));
        if (mdFile) {
            mdFilePath = path.join(folderPath, mdFile);
        }
    } catch (e) {
        // Ignorar errores al acceder a la carpeta
    }

    let staticDetails = '';
    if (mdFilePath && fs.existsSync(mdFilePath)) {
        console.log(`- Detectado archivo Markdown para ${folder}: ${path.basename(mdFilePath)}. Renderizando...`);
        const mdContent = fs.readFileSync(mdFilePath, 'utf8');
        staticDetails = parseMarkdownToHtml(mdContent);
    } else {
        staticDetails = hardcodedDetails[folder] || `
            <div class="card">
                <div class="card-title">📁 Información de la Carpeta: ${folder}</div>
                <p>Sección dinámicamente detectada en el espacio de trabajo local de San Mamés. Registra la documentación y planos específicos correspondientes.</p>
            </div>
        `;
    }

    panelsHtml += `
        <!-- TAB: ${folder.toUpperCase()} -->
        <div id="tab-${folder.toLowerCase()}" class="tab-panel">
            ${staticDetails}
        </div>
    `;
});

// 6. El Documento HTML Completo (La Plantilla Premium)
const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dossier Operativo: ZETAK @ San Mamés</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0b0f19;
            --card-bg: #151d30;
            --accent-blue: #38bdf8;
            --accent-purple: #818cf8;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border-light: #223049;
            --success: #2ecc71;
            --warning: #f1c40f;
            --danger: #e74c3c;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-main);
            margin: 0;
            padding: 0;
            min-height: 100vh;
        }

        .layout-container {
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar Navegación */
        .sidebar {
            width: 280px;
            background-color: #0e1424;
            border-right: 1px solid var(--border-light);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            position: fixed;
            height: calc(100vh - 60px);
            overflow-y: auto;
        }

        .logo-section {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-bottom: 20px;
        }

        .logo-section h2 {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .logo-section span {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-muted);
            font-weight: 600;
        }

        .nav-menu {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 8px;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            cursor: pointer;
            border: 1px solid transparent;
        }

        .nav-item:hover {
            background-color: rgba(56, 189, 248, 0.08);
            color: var(--text-main);
        }

        .nav-item.active {
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(129, 204, 248, 0.05));
            border-color: rgba(56, 189, 248, 0.3);
            color: var(--accent-blue);
        }

        /* Main Content */
        .main-content {
            margin-left: 320px;
            padding: 40px;
            width: calc(100% - 380px);
        }

        .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            border-bottom: 1px solid var(--border-light);
            padding-bottom: 20px;
        }

        .header-info h1 {
            font-size: 28px;
            margin: 0 0 5px 0;
            font-weight: 700;
            letter-spacing: -0.5px;
        }

        .header-info p {
            color: var(--text-muted);
            margin: 0;
            font-size: 14px;
        }

        /* Botón de Sincronización */
        .btn-sync {
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            color: #000;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px -3px rgba(56, 189, 248, 0.4);
        }

        .btn-sync:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px -3px rgba(56, 189, 248, 0.6);
        }

        /* Contenido por Pestaña */
        .tab-panel {
            display: none;
            animation: fadeIn 0.4s ease;
        }

        .tab-panel.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Tarjetas Informativas */
        .card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-light);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 25px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .card-title {
            font-size: 18px;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 20px;
            color: var(--accent-blue);
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid var(--border-light);
            padding-bottom: 10px;
        }

        /* Estilo de la Sección de Bienvenida */
        .welcome-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 30px;
        }

        .welcome-hero {
            background: linear-gradient(135deg, #1b2640, #131b30);
            border: 1px solid var(--border-light);
            border-radius: 12px;
            padding: 35px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .welcome-hero h3 {
            font-size: 24px;
            margin: 0;
            background: linear-gradient(90deg, #38bdf8, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .alert-box {
            background-color: rgba(231, 76, 60, 0.1);
            border: 1px solid rgba(231, 76, 60, 0.3);
            border-left: 5px solid var(--danger);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .alert-box h4 {
            margin: 0 0 8px 0;
            color: #f1948a;
            font-weight: 600;
            font-size: 15px;
        }

        .alert-box p {
            margin: 0;
            color: var(--text-main);
            font-size: 14px;
            line-height: 1.6;
        }

        /* FAQ Acordeón */
        .faq-item {
            background-color: rgba(30, 41, 59, 0.5);
            border: 1px solid var(--border-light);
            border-radius: 8px;
            margin-bottom: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .faq-trigger {
            padding: 16px 20px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
            background-color: rgba(30, 41, 59, 0.8);
        }

        .faq-trigger:hover {
            background-color: rgba(56, 189, 248, 0.05);
            color: var(--accent-blue);
        }

        .faq-content {
            padding: 0 20px;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s cubic-bezier(0, 1, 0, 1), padding 0.3s ease;
            font-size: 14px;
            color: var(--text-muted);
            line-height: 1.6;
            background-color: #0f172a;
        }

        .faq-item.open .faq-content {
            max-height: 300px;
            padding: 16px 20px;
        }

        /* Tablas */
        .table-responsive {
            width: 100%;
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid var(--border-light);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 13.5px;
        }

        th {
            background-color: #121826;
            padding: 14px 16px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            border-bottom: 2px solid var(--border-light);
        }

        td {
            padding: 14px 16px;
            border-bottom: 1px solid var(--border-light);
            color: var(--text-main);
        }

        tr:hover {
            background-color: rgba(255,255,255,0.02);
        }

        /* Badges y Chips */
        .badge {
            display: inline-block;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 10.5px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge.blue { background-color: rgba(56, 189, 248, 0.15); color: var(--accent-blue); }
        .badge.purple { background-color: rgba(129, 140, 248, 0.15); color: var(--accent-purple); }
        .badge.green { background-color: rgba(46, 204, 113, 0.15); color: var(--success); }
        .badge.orange { background-color: rgba(241, 196, 15, 0.15); color: var(--warning); }
        .badge.red { background-color: rgba(231, 76, 60, 0.15); color: var(--danger); }

        /* Modal Sincronización */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            backdrop-filter: blur(5px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }

        .modal-overlay.open {
            opacity: 1;
            pointer-events: auto;
        }

        .modal-box {
            background-color: var(--card-bg);
            border: 1px solid var(--border-light);
            border-radius: 12px;
            padding: 35px;
            width: 90%;
            max-width: 450px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            transform: scale(0.9);
            transition: transform 0.3s ease;
        }

        .modal-overlay.open .modal-box {
            transform: scale(1);
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid var(--border-light);
            border-top: 4px solid var(--accent-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .modal-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .modal-desc {
            color: var(--text-muted);
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 20px;
        }

        /* Lista de Contactos por Días */
        .contact-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .contact-item {
            background-color: rgba(30, 41, 59, 0.4);
            border: 1px solid var(--border-light);
            border-radius: 8px;
            padding: 15px 20px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            text-decoration: none;
            color: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .contact-item:hover {
            border-color: var(--accent-blue);
            background-color: rgba(56, 189, 248, 0.08);
            transform: translateY(-2px);
        }

        .contact-name {
            font-weight: 600;
            font-size: 14.5px;
            color: var(--text-main);
        }

        .contact-role {
            font-size: 12.5px;
            color: var(--accent-blue);
            font-weight: 500;
        }

        .contact-info {
            font-size: 13px;
            color: var(--text-muted);
            margin-top: 5px;
        }

        /* Vista de Peticiones del Email */
        tr.status-green { border-left: 3px solid var(--success); background-color: rgba(46, 204, 113, 0.04); }
        tr.status-orange { border-left: 3px solid var(--warning); background-color: rgba(241, 196, 15, 0.04); }
        tr.status-red { border-left: 3px solid var(--danger); background-color: rgba(231, 76, 60, 0.04); }

        .btn-close-modal {
            background-color: #334155;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .btn-close-modal:hover {
            background-color: #475569;
        }

        /* ==========================================
           RESPONSIVE DESIGN (Mobile Friendly)
           ========================================== */
        
        @media (max-width: 1024px) {
            .layout-container {
                flex-direction: column;
            }

            .sidebar {
                width: 100%;
                height: auto;
                position: fixed;
                top: 0;
                left: 0;
                z-index: 1000;
                border-right: none;
                border-bottom: 1px solid var(--border-light);
                padding: 12px 15px;
                background-color: #0e1424;
                gap: 10px;
            }

            .logo-section {
                margin-bottom: 10px;
                flex-direction: row;
                align-items: center;
                gap: 10px;
            }

            .logo-section span {
                display: none;
            }

            .nav-menu {
                flex-direction: row;
                overflow-x: auto;
                padding-bottom: 5px;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
            }

            .nav-menu::-webkit-scrollbar {
                display: none;
            }

            .nav-item {
                white-space: nowrap;
                padding: 8px 14px;
                font-size: 13px;
                flex-shrink: 0;
            }

            .main-content {
                margin-left: 0;
                margin-top: 130px;
                padding: 20px;
                width: 100%;
                box-sizing: border-box;
            }

            .welcome-grid {
                grid-template-columns: 1fr;
            }

            .header-bar {
                margin-bottom: 25px;
            }
        }

        @media (max-width: 768px) {
            .main-content {
                margin-top: 120px;
            }
            
            .header-info h1 {
                font-size: 22px;
            }

            .welcome-hero {
                padding: 20px;
            }

            .contact-grid {
                grid-template-columns: 1fr;
            }

            .card {
                padding: 16px;
            }
        }

        @media (max-width: 480px) {
            .sidebar {
                padding: 10px;
            }

            .logo-section h2 {
                font-size: 16px;
            }
            
            .main-content {
                margin-top: 110px;
            }
        }
    </style>
</head>
<body>

<div class="layout-container">
    <!-- SIDEBAR -->
    <div class="sidebar">
        <div class="logo-section">
            <h2>ZETAK SAN MAMÉS</h2>
            <span>Dossier de Operaciones</span>
        </div>

        <nav class="nav-menu">
${navHtml}        </nav>
    </div>

    <!-- MAIN CONTENT -->
    <div class="main-content">
        <div class="header-bar">
            <div class="header-info">
                <h1 id="page-title">Introducción y bienvenida</h1>
                <p>Aspectos básicos del evento</p>
            </div>
        </div>

${panelsHtml}    </div>
</div>

<script>
    function switchTab(tabId) {
        // Cambiar items activos de la navegación
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Asignar activo al seleccionado
        const clickedItem = Array.from(navItems).find(item => item.getAttribute('onclick').includes(tabId));
        if (clickedItem) clickedItem.classList.add('active');

        // Cambiar paneles
        const panels = document.querySelectorAll('.tab-panel');
        panels.forEach(panel => panel.classList.remove('active'));
        document.getElementById('tab-' + tabId).classList.add('active');

        // Cambiar título de página
        document.getElementById('page-title').innerHTML = clickedItem.innerHTML;
    }

    function toggleFaq(element) {
        const item = element.parentElement;
        item.classList.toggle('open');
        const span = element.querySelector('span');
        if(item.classList.contains('open')) {
            span.textContent = '➖';
        } else {
            span.textContent = '➕';
        }
    }

</script>

</body>
</html>
`;

// 7. Sobrescribir el index.html final
fs.writeFileSync(indexHtmlPath, htmlTemplate, 'utf8');
console.log('=== ¡Sincronización de index.html realizada con éxito! ===');
console.log('Archivo guardado en:', indexHtmlPath);
