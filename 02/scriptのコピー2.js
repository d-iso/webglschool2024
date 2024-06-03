'use strict';

import * as THREE from '../lib/three.module.js';
// import * as THREE from 'three';

// シーン、カメラ、レンダラーを作成
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ライトを追加
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);

// 扇風機のベースを作成
const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
const base = new THREE.Mesh(baseGeometry, baseMaterial);
base.position.set(0, -1.5, 0);
scene.add(base);

// シャフトを作成
const shaftGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 32);
const shaftMaterial = new THREE.MeshLambertMaterial({ color: 0x404040 });
const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
shaft.position.set(0, 0, 0);
scene.add(shaft);

// 扇風機のヘッドを作成（首振りのためにグループ化）
const head = new THREE.Group();
scene.add(head);

// 扇風機のハブを作成
const hubGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32); // ハブのサイズを調整
const hubMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
const hub = new THREE.Mesh(hubGeometry, hubMaterial);
hub.position.set(0, 0, 0);
head.add(hub);

// 扇風機の羽を作成
const createFanBlade = () => {
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.bezierCurveTo(3, 0, 0.75, 2.5, 0, 2.5); // 扇風機の羽の曲線を調整
		// bladeShape.bezierCurveTo(2.5, 0.75, 3, 3, 0, 2.5); // 扇風機の羽の曲線を調整
    bladeShape.lineTo(-0.05, 2.5); // テーパーを追加
    bladeShape.bezierCurveTo(-0.75, 2.5, -3, 0, 0, 0); // 扇風機の羽の曲線を調整

    const extrudeSettings = {
        depth: 0.01,  // 羽の厚さを薄く設定
        bevelEnabled: true,  // ベベルを有効にする
        bevelThickness: 0.005,  // ベベルの厚さ
        bevelSize: 0.005,  // ベベルのサイズ
        bevelSegments: 1  // ベベルのセグメント数
    };

    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    return new THREE.Mesh(bladeGeometry, new THREE.MeshLambertMaterial({ color: 0x00ff00, side: THREE.DoubleSide }));
};

const blades = [];
for (let i = 0; i < 1; i++) {  // 羽を3枚作成
    const blade = createFanBlade();
    blade.position.set(0, 0, 0.06);  // ハブの前に配置
    blade.rotation.z = i * (Math.PI / 1.5);  // 120度ずつ回転させて配置
    blades.push(blade);
    hub.add(blade);  // ハブに追加
}

// 扇風機ヘッドの位置を調整
head.position.y = 1.5;

// カメラの位置を設定
camera.position.z = 10;

// アニメーションループを作成
let headRotationDirection = 1;
// function animate() {
//     requestAnimationFrame(animate);

//     // ハブを回転させることで羽が回転する
//     hub.rotation.z += 0.1;

//     // 首振り機能
//     head.rotation.y += headRotationDirection * 0.01;
//     if (head.rotation.y > Math.PI / 4 || head.rotation.y < -Math.PI / 4) {
//         headRotationDirection *= -1;
//     }

//     renderer.render(scene, camera);
// }
// animate();

let rotationPaused = false; // 回転が一時停止されているかどうかのフラグ

// キーボードイベントのリスナーを追加
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        rotationPaused = !rotationPaused; // フラグを反転させる
    }
});

// アニメーションループ内での処理
function animate() {
    // requestAnimationFrame(animate);

    // スペースキーが押されていなければ回転させる
    if (!rotationPaused) {
        hub.rotation.z += 0.1;
    // 首振り機能
    head.rotation.y += headRotationDirection * 0.01;
    if (head.rotation.y > Math.PI / 4 || head.rotation.y < -Math.PI / 4) {
        headRotationDirection *= -1;
    }

    }


    renderer.render(scene, camera);
}
animate();