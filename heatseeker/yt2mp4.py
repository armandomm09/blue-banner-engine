import subprocess
import os

LINKS_FILE = "yt_vids.txt"

DOWNLOAD_SCRIPT_PATH = "Download-Simply-Videos-From-YouTube/download.py"

SAVE_PATH = "/Users/armando/Progra/ai/agscout/downloaded_yt_vid"
FORMAT_CHOICE = "1"


def run_download_process(youtube_url):
    print(f"\n{'='*20}\nIniciando descarga para: {youtube_url}\n{'='*20}")

    input_text = f"{youtube_url}\n{SAVE_PATH}\n{FORMAT_CHOICE}\n"

    command = ["python3", DOWNLOAD_SCRIPT_PATH]

    try:

        result = subprocess.run(
            command, input=input_text, text=True, capture_output=True, check=True
        )

        print("-> Descarga iniciada con éxito por el script.")

        print("\n--- Salida del script de descarga ---\n")
        print(result.stdout)
        print("\n--- Fin de la salida ---\n")

    except FileNotFoundError:
        print(f"ERROR: No se encontró el script en '{DOWNLOAD_SCRIPT_PATH}'.")
        print(
            "Asegúrate de que la ruta sea correcta y estés ejecutando desde la carpeta principal."
        )
        return False
    except subprocess.CalledProcessError as e:
        print(f"ERROR: El script de descarga falló para la URL: {youtube_url}")
        print("El script de descarga devolvió un error. Aquí está su salida:")
        print(e.stderr)
        return False

    return True


if __name__ == "__main__":

    if not os.path.exists(LINKS_FILE):
        print(f"ERROR: No se encuentra el archivo '{LINKS_FILE}'.")
        print(
            "Por favor, crea este archivo y añade los enlaces de YouTube, uno por línea."
        )
    else:

        os.makedirs(SAVE_PATH, exist_ok=True)

        print("Iniciando proceso de descarga por lotes...")

        with open(LINKS_FILE, "r") as f:
            urls = f.readlines()

        success_count = 0
        fail_count = 0

        for i, url in enumerate(urls):

            clean_url = url.strip()

            if not clean_url:
                continue

            print(f"\nProcesando video {i+1} de {len(urls)}...")
            if run_download_process(clean_url):
                success_count += 1
            else:
                fail_count += 1

        print("\n=====================================")
        print("¡Proceso de descarga por lotes finalizado!")
        print(f"Descargas exitosas: {success_count}")
        print(f"Descargas fallidas: {fail_count}")
        print("=====================================")
