#!/usr/bin/env python3
import pathlib, subprocess, tempfile

source_root = pathlib.Path(__file__).resolve().parents[1]
prepare_src = source_root / 'scripts' / 'prepare-android.py'
with tempfile.TemporaryDirectory(prefix='si-android-scaffold-') as td:
    root = pathlib.Path(td)
    (root / 'scripts').mkdir()
    (root / 'scripts' / 'prepare-android.py').write_bytes(prepare_src.read_bytes())
    app = root / 'android' / 'app'
    (app / 'src/main/java/ir/siteinspector/app').mkdir(parents=True)
    (app / 'src/main').mkdir(parents=True, exist_ok=True)
    (app / 'src/main/AndroidManifest.xml').write_text('<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:name=".MainApplication"></application></manifest>', encoding='utf-8')
    (app / 'build.gradle').write_text("apply plugin: 'com.android.application'\nandroid { defaultConfig { minSdkVersion rootProject.ext.minSdkVersion } }\ndependencies { }\n", encoding='utf-8')
    (root / 'android' / 'variables.gradle').write_text('ext {\n    minSdkVersion = 23\n}\n', encoding='utf-8')
    (root / 'android' / 'gradle.properties').write_text('org.gradle.jvmargs=-Xmx1536m\n', encoding='utf-8')
    (root / 'android' / 'build.gradle').write_text("buildscript { ext.kotlin_version = '1.9.25'\nrepositories { google(); mavenCentral() }\ndependencies { classpath 'com.android.tools.build:gradle:8.7.2'; classpath \"org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version\" } }\next { minSdkVersion = 23 }\n", encoding='utf-8')
    (app / 'src/main/java/ir/siteinspector/app/MainActivity.java').write_text('package ir.siteinspector.app;\nimport com.getcapacitor.BridgeActivity;\npublic class MainActivity extends BridgeActivity {\n}\n', encoding='utf-8')
    run = subprocess.run(['python3', str(root / 'scripts' / 'prepare-android.py')], capture_output=True, text=True)
    if run.returncode != 0:
        raise SystemExit(run.stdout + run.stderr)
    manifest = (app / 'src/main/AndroidManifest.xml').read_text(encoding='utf-8')
    app_gradle = (app / 'build.gradle').read_text(encoding='utf-8')
    root_gradle = (root / 'android' / 'build.gradle').read_text(encoding='utf-8')
    main = (app / 'src/main/java/ir/siteinspector/app/MainActivity.java').read_text(encoding='utf-8')
    plugin = (app / 'src/main/java/ir/siteinspector/app/SIOnDeviceAIPlugin.kt').read_text(encoding='utf-8')
    assert 'usesCleartextTraffic="false"' in manifest
    assert 'android.permission.INTERNET' in manifest
    assert 'litertlm-android:0.19.1' in app_gradle
    assert 'versionCode 196' in app_gradle and 'versionName \"1.83.0\"' in app_gradle
    assert 'org.jetbrains.kotlin.android' in app_gradle
    assert 'kotlin-gradle-plugin:2.4.21' in root_gradle and "ext.kotlin_version = '2.4.21'" in root_gradle
    assert 'minSdkVersion = 24' in root_gradle
    assert 'JvmTarget.JVM_21' in app_gradle and 'si-packaging-excludes' in app_gradle
    assert 'minSdkVersion = 24' in (root / 'android' / 'variables.gradle').read_text(encoding='utf-8')
    props = (root / 'android' / 'gradle.properties').read_text(encoding='utf-8')
    assert '-Xmx4g' in props and '-Xmx1536m' not in props and 'kotlin.daemon.jvmargs=-Xmx2g' in props
    assert 'SIOnDeviceAIPlugin' in main and '@CapacitorPlugin(name = "SIOnDeviceAI")' in plugin
    assert 'MessageDigest.getInstance("SHA-256")' in plugin
    assert 'verificationCacheMatches' in plugin and 'verifyModelFile' in plugin
    assert 'minAvailableRam' in plugin
    assert 'resolve/28299f30ee4d43294517a4ac93abd6163412f07f/' in plugin
    assert 'resolve/6e5c4f1e395deb959c494953478fa5cec4b8008f/' in plugin
    assert 'resolve/2670e142a0d16a1b685be6604e5b4f2b31a826d7/' in plugin
    assert 'resolve/8c9f652b5233a80313d5c848f3656e492cf0397f/' in plugin
    assert 'candidate?.close()' not in plugin, 'failed LiteRT initialize candidates must not be closed'
    assert 'readyEngine.close()' in plugin
    assert 'fun importModel(call: PluginCall)' in plugin and '@ActivityCallback' in plugin and 'ACTION_OPEN_DOCUMENT' in plugin
    assert 'resolveDownloadUrl(spec.url' in plugin and 'm.scheme != "https"' in plugin
    assert 'verifyModelFile(id)' in plugin.split('fun importModelResult')[1]
print('Android scaffold preparation tests OK (simulation only; not a Gradle build)')
