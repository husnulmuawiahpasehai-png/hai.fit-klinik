(function () {

  var WA = '6282260579838';
  var D = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  /* Jadwal praktik: [[nomor hari], 'jam'] (1 = Senin ... 6 = Sabtu) */

  var DOCS = [
    { n: 'dr. Wayabulani', r: 'Dokter Umum', s: [[[1, 3, 6], '16.00–21.00']] },
    { n: 'dr. Desy Iriani', r: 'Dokter Umum', s: [[[1, 2, 3, 4, 5], '09.30–14.30'], [[2, 4, 5], '16.00–21.00']] },
    { n: 'drg. Syamsuriani', r: 'Dokter Gigi', s: [[[2, 4, 6], '14.00–16.00']] },
    { n: 'drg. Nurlailah', r: 'Dokter Gigi', s: [[[1, 2, 3, 4, 5], '17.00–20.00']] },
    { n: 'dr. Sitti Fitriani, Sp.M, M.Kes', r: 'Dokter Spesialis Mata', s: [[[1, 2, 3, 4], '18.30–20.00'], [[5, 6], '17.00–20.00']] },
    { n: 'dr. Indra Permatasari, Sp.M', r: 'Dokter Spesialis Mata', s: [[[1, 2], '12.00–15.00'], [[3, 4, 5], '09.00–15.00']] }
  ];

  /* ---------- Status buka/tutup (waktu Makassar) ---------- */

  var parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(new Date());

  var map = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  var wd = 0;
  var h = 0;
  var m = 0;

  parts.forEach(function (p) {
    if (p.type === 'weekday') wd = map[p.value];
    if (p.type === 'hour') h = +p.value % 24;
    if (p.type === 'minute') m = +p.value;
  });

  var mins = h * 60 + m;
  var workday = wd >= 1 && wd <= 6;

  var st = document.getElementById('status');
  var tx = document.getElementById('statusText');

  if (st && tx) {
    if (workday && mins >= 540 && mins < 1260) {
      st.classList.add('open');
      tx.textContent = 'Buka sekarang, tutup pukul 21.00 WITA';
    } else if (workday && mins < 540) {
      tx.textContent = 'Tutup, buka hari ini pukul 09.00 WITA';
    } else {
      tx.textContent = 'Tutup, buka lagi ' +
        (wd === 6 || wd === 0 ? 'Senin' : 'besok') +
        ' pukul 09.00 WITA';
    }
  }

  /* ---------- Jadwal dokter per hari ---------- */

  var sel = workday ? wd : 1;
  var tabs = document.getElementById('tabs');
  var docs = document.getElementById('docs');

  function el(tag, cls, text) {
    var n = document.createElement(tag);

    if (cls) n.className = cls;
    if (text) n.textContent = text;

    return n;
  }

  function draw() {
    tabs.innerHTML = '';

    for (var d = 1; d <= 6; d++) {
      (function (d) {
        var b = el(
          'button',
          'tab',
          D[d] + (d === wd ? ' (hari ini)' : '')
        );

        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', d === sel);

        b.onclick = function () {
          sel = d;
          draw();
        };

        tabs.appendChild(b);
      })(d);
    }

    docs.innerHTML = '';

    DOCS.forEach(function (x) {
      var t = [];

      x.s.forEach(function (s) {
        if (s[0].indexOf(sel) > -1) {
          t.push(s[1]);
        }
      });

      var c = el('div', 'doc' + (t.length ? '' : ' off'));

      var ini = x.n
        .replace(/^(drg?\.)\s*/i, '')
        .split(' ')
        .slice(0, 2)
        .map(function (w) {
          return w[0];
        })
        .join('');

      c.appendChild(el('div', 'avatar', ini));
      c.appendChild(el('h3', '', x.n));
      c.appendChild(el('div', 'role', x.r));

      if (t.length) {
        t.forEach(function (v) {
          c.appendChild(el('div', 'time', v + ' WITA'));
        });
      } else {
        c.appendChild(
          el('div', 'time none', 'Tidak praktik hari ini')
        );
      }

      var umum = x.r === 'Dokter Umum';

      c.appendChild(
        el(
          'span',
          'tag ' + (umum ? 'walk' : 'res'),
          umum ? 'Stand by, tanpa reservasi' : 'Dengan reservasi'
        )
      );

      docs.appendChild(c);
    });
  }

  draw();

  /* ---------- Formulir reservasi -> WhatsApp ---------- */

  var fSvc = document.getElementById('fSvc');
  var fDoc = document.getElementById('fDoc');
  var fDate = document.getElementById('fDate');
  var fTime = document.getElementById('fTime');
  var hint = document.getElementById('hint');

  var pad = function (n) {
    return (n < 10 ? '0' : '') + n;
  };

  var now = new Date();

  fDate.min =
    now.getFullYear() +
    '-' +
    pad(now.getMonth() + 1) +
    '-' +
    pad(now.getDate());

  function fillDocs() {
    fDoc.innerHTML = '';

    DOCS
      .filter(function (x) {
        return x.r === fSvc.value;
      })
      .forEach(function (x) {
        var o = el('option', '', x.n);
        o.value = x.n;
        fDoc.appendChild(o);
      });

    update();
  }

  function slots() {
    if (!fDate.value) return null;

    var day = new Date(
      fDate.value + 'T12:00:00'
    ).getDay();

    var x = DOCS.filter(function (d) {
      return d.n === fDoc.value;
    })[0];

    var t = [];

    if (!x) return null;

    x.s.forEach(function (s) {
      if (s[0].indexOf(day) > -1) {
        t.push(s[1]);
      }
    });

    return {
      day: day,
      t: t
    };
  }

  function update() {
    hint.className = 'hint';

    var r = slots();

    if (!r) {
      hint.textContent =
        'Pilih dokter dan tanggal untuk melihat jam praktik.';
      return;
    }

    if (r.day === 0) {
      hint.textContent =
        'Klinik tutup hari Minggu. Pilih Senin–Sabtu.';
      hint.className = 'hint err';
      return;
    }

    if (r.t.length) {
      hint.textContent =
        'Jam praktik ' +
        fDoc.value +
        ' hari ' +
        D[r.day] +
        ': ' +
        r.t.join(' dan ') +
        ' WITA.';
    } else {
      hint.textContent =
        fDoc.value +
        ' tidak praktik hari ' +
        D[r.day] +
        '. Pilih hari lain.';
      hint.className = 'hint err';
    }
  }

  fSvc.onchange = fillDocs;
  fDoc.onchange = update;
  fDate.onchange = update;

  document.getElementById('send').onclick = function () {

    var name = document.getElementById('fName').value.trim();
    var phone = document.getElementById('fPhone').value.trim();
    var note = document.getElementById('fNote').value.trim();
    var r = slots();

    if (!fDate.value || !fTime.value || !name || !phone) {
      hint.textContent =
        'Lengkapi tanggal, jam, nama, dan nomor WhatsApp.';
      hint.className = 'hint err';
      return;
    }

    if (r.day === 0 || !r.t.length) {
      update();
      return;
    }

    var tgl =
      D[r.day] +
      ', ' +
      new Date(
        fDate.value + 'T12:00:00'
      ).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

    var msg =
      'Halo Hai.fit, saya ingin reservasi.\n' +
      'Layanan: ' + fSvc.value +
      '\nDokter: ' + fDoc.value +
      '\nTanggal: ' + tgl +
      '\nJam: ' + fTime.value + ' WITA' +
      '\nNama: ' + name +
      '\nNo. WhatsApp: ' + phone +
      (note ? '\nKeluhan: ' + note : '');

    window.open(
      'https://wa.me/' +
      WA +
      '?text=' +
      encodeURIComponent(msg),
      '_blank',
      'noopener'
    );
  };

  fillDocs();

  /* ---------- Daftar tarif ---------- */

  var TARIF = {

    'Poli Umum': [
      ['Admin', 10000],
      ['Konsultasi Dokter Umum', 50000],
      ['Pemeriksaan Kolestrol', 25000],
      ['Pemeriksaan GDS', 20000],
      ['Pemeriksaan Asam Urat', 30000],
      ['Jahit Luka 1–5', 85000],
      ['Jahit Luka 5–10', 95000],
      ['Jahit Luka >10', 110000],
      ['Insisi/eksisi', 65000],
      ['Luka bakar di bawah >10% tanpa komplikasi', 100000],
      ['Rawat Luka Kecil', 40000],
      ['Rawat Luka Sedang', 60000],
      ['Rawat Luka Besar', 75000],
      ['Ekstraksi Serumen Telinga', 65000],
      ['Ekstraksi Kuku', 100000],
      ['Ekstraksi Korpal', 50000],
      ['Nebulizer', 80000],
      ['Ganti Perban', 35000],
      ['Irigasi Telinga', 30000],
      ['Irigasi Hidung', 30000],
      ['Pemasangan Nebulizer', 35000],
      ['Pemasangan Infus', 55000],
      ['Pemasangan Kateter', 70000],
      ['Oksigenisasi (per strip skala regulator)', 20000],
      ['Lepas Jahitan', 40000],
      ['Injeksi (IM/IV/SC)', 38000],
      ['Home care', 230000],
      ['Surat Keterangan Sehat', 50000]
    ],

    'Poli Gigi': [
      ['Admin', 10000],
      ['Pemeriksaan dan Pengobatan', 60000],
      ['Konsultasi Kesehatan Gigi dan Mulut', 60000],
      ['Pencabutan Gigi Anak Mudah', 100000],
      ['Pencabutan Gigi Anak Sulit', 150000],
      ['Pencabutan Gigi Dewasa Mudah', 200000],
      ['Pencabutan Gigi Dewasa Sedang', 250000],
      ['Pencabutan Gigi Dewasa Sulit', 400000],
      ['Pembersihan Karang Gigi Mudah', 250000],
      ['Pembersihan Karang Gigi Sulit', 350000],
      ['Penambalan Gigi GI Kecil', 150000],
      ['Penambalan Gigi GI Besar', 180000],
      ['Penambalan Gigi Post Komposit Kecil', 200000],
      ['Penambalan Gigi Post Komposit Besar', 300000],
      ['Penambalan Gigi Anterior Kecil', 250000],
      ['Penambalan Gigi Anterior Besar', 350000],
      ['Pembuatan Gigi Palsu', null]
    ],

    'Poli Spesialis Mata': [
      ['Admin', 10000],
      ['Konsultasi Dokter Mata General + Slit Lamp', 150000],
      ['Pemeriksaan Visus', 15000],
      ['Pemeriksaan Visus + Koreksi', 45000],
      ['Pemeriksaan Autoref', 35000],
      ['Pemeriksaan Tonometri Eye Care', 40000],
      ['Pemeriksaan Flourescein', 30000],
      ['Pemeriksaan Fundus Copy', 50000],
      ['Tindakan Corpus Alienum', 300000],
      ['Tindakan Insisi Kalazion / Hordeolum', 550000],
      ['Epilasi', 100000],
      ['Spooling Mata', 100000],
      ['Pemeriksaan Buta Warna', 60000],
      ['Frame Kacamata', null]
    ]
  };

  /* ---------- Layanan Optik Klinik Utama Hai.fit (sesuai brosur) ---------- */

  var OPTIK = [
    ['Konsultasi dan pemeriksaan kesehatan mata', 'Bersama dokter spesialis mata'],
    ['Pemeriksaan refraksi', 'Pemeriksaan kelainan refraksi untuk menentukan resep kacamata yang tepat'],
    ['Berbagai pilihan frame modern', 'Untuk anak dan dewasa'],
    ['Lensa anti UV dan blue light', 'Melindungi mata dari sinar UV, radiasi layar, dan sinar biru digital'],
    ['Lensa photochromic', 'Melindungi mata dari sinar UV, berubah warna sesuai cahaya, dan mengurangi silau di luar ruangan'],
    ['Pemasangan protesa mata', 'Solusi estetika dan fungsional untuk kenyamanan Anda']
  ];

  var OPTIK_WHY = [
    'Pemeriksaan mata dengan alat modern',
    'Tenaga profesional dan ramah',
    'Banyak pilihan frame untuk anak & dewasa',
    'Harga terjangkau dengan kualitas terbaik',
    'Layanan cepat, aman dan nyaman'
  ];

  var dlg = document.getElementById('tarifDlg');
  var tList = document.getElementById('tarifList');

  function rupiah(v, alt) {
    return v == null
      ? alt
      : 'Rp ' + v.toLocaleString('id-ID');
  }

  function openTarif(k) {

    document.getElementById('dlgTitle').textContent =
      'Jenis & tarif · ' + k;

    tList.innerHTML = '';

    var note = dlg.querySelector('.tarif-note');
    if (!note.hasAttribute('data-default')) note.setAttribute('data-default', note.textContent);
    note.textContent = note.getAttribute('data-default');

    if (k === 'Optik') {
      document.getElementById('dlgTitle').textContent = 'Layanan · Optik Klinik Utama Hai.fit';
      note.textContent = 'Lihat dunia lebih jelas, hidup lebih nyaman. Untuk harga frame dan lensa, tanyakan ke klinik lewat WhatsApp. *Syarat & ketentuan berlaku.';
      OPTIK.forEach(function (r, i) {
        var row = el('div', 'trow opt');
        row.appendChild(el('span', 'tno', String(i + 1)));
        var box = el('div', 'tbox');
        box.appendChild(el('div', 'tname', r[0]));
        box.appendChild(el('div', 'tdesc', r[1]));
        row.appendChild(box);
        tList.appendChild(row);
      });
      var why = el('div', 'why');
      why.appendChild(el('h4', '', 'Mengapa memilih kami?'));
      var ul = el('ul');
      OPTIK_WHY.forEach(function (w) { ul.appendChild(el('li', '', w)); });
      why.appendChild(ul);
      tList.appendChild(why);
      dlg.showModal();
      dlg.scrollTop = 0;
      return;
    }

    if (!TARIF[k]) return;

    TARIF[k].forEach(function (r, i) {

      var row = el('div', 'trow');

      row.appendChild(
        el('span', 'tno', String(i + 1))
      );

      row.appendChild(
        el('span', 'tname', r[0])
      );

      row.appendChild(
        el(
          'span',
          'tprice' + (r[1] == null ? ' alt' : ''),
          rupiah(
            r[1],
            r[0] === 'Frame Kacamata'
              ? 'Tanyakan ke klinik'
              : 'Disesuaikan'
          )
        )
      );

      tList.appendChild(row);
    });

    dlg.showModal();
    dlg.scrollTop = 0;
  }

  document
    .querySelectorAll('.svc.clickable')
    .forEach(function (c) {

      c.onclick = function () {
        openTarif(
          c.getAttribute('data-poli')
        );
      };

      c.onkeydown = function (e) {

        if (
          e.key === 'Enter' ||
          e.key === ' '
        ) {
          e.preventDefault();

          openTarif(
            c.getAttribute('data-poli')
          );
        }
      };
    });

  document.getElementById('dlgClose').onclick = function () {
    dlg.close();
  };

  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) {
      dlg.close();
    }
  });

})();