const fetch = require("node-fetch");
const path = require('path');
const express = require('express');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const isPlaceholder = (value) =>
    !value ||
    value.includes('your_supabase') ||
    value.includes('replace_me');

const hasSupabase =
    !isPlaceholder(process.env.SUPABASE_URL) &&
    !isPlaceholder(process.env.SUPABASE_ANON_KEY);

const supabase = hasSupabase
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
    )
    : null;

const getUserClient = (req) => {
    if (!hasSupabase) return null;
    if (!req.session?.access_token) return supabase;
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${req.session.access_token}`
            }
        }
    });
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'dev_secret',
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true }
    })
);

const requireAuth = (req, res, next) => {
    if (req.session?.user) return next();
    return res.redirect('/login');
};


app.get('/', (req, res) => {
    if (req.session?.user) return res.redirect('/app');
    return res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login', { error: req.query.error || null });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.redirect('/login?error=Missing%20credentials');
    }
    if (!hasSupabase) {
        if (email === 'demo@farm.com' && password === 'harvest123') {
            req.session.user = {
                id: 'demo-user',
                email,
                name: 'Demo User'
            };
            req.session.access_token = null;
            return res.redirect('/app');
        }
        return res.redirect('/login?error=Supabase%20not%20configured.%20Use%20demo@farm.com%20/%20harvest123%20or%20set%20SUPABASE_URL%20and%20SUPABASE_ANON_KEY');
    }
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data?.user) {
            return res.redirect('/login?error=Invalid%20credentials');
        }
        const name =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            email.split('@')[0];

        req.session.user = {
            id: data.user.id,
            email: data.user.email,
            name
        };
        req.session.access_token = data.session?.access_token || null;
        return res.redirect('/app');
    } catch (err) {
        return res.redirect('/login?error=Login%20failed');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

app.get('/app', requireAuth, async (req, res) => {
    let predictions = [];
    if (hasSupabase) {
        try {
            const userClient = getUserClient(req);
            const { data } = await userClient
                .from('predictions')
                .select('created_at, crop, yield')
                .eq('user_id', req.session.user.id)
                .order('created_at', { ascending: false })
                .limit(5);
            if (Array.isArray(data)) predictions = data;
        } catch (e) {
            // If table doesn't exist, keep fallback
        }
    }
    res.render('yield', { user: req.session.user, predictions });
});

app.post('/api/predict', requireAuth, async (req, res) => {
    const nitrogen = Number(req.body.nitrogen ?? req.body.Nitrogen);
    const phosphorus = Number(req.body.phosphorus ?? req.body.Phosphorus);
    const potassium = Number(req.body.potassium ?? req.body.Potassium);
    const temperature = Number(req.body.temperature ?? req.body.Temperature);
    const humidity = Number(req.body.humidity ?? req.body.Humidity);
    const phValue = Number(req.body.ph_value ?? req.body.pH_Value ?? req.body.phValue);
    const rainfall = Number(req.body.rainfall ?? req.body.Rainfall);

    if ([nitrogen, phosphorus, potassium, temperature, humidity, phValue, rainfall].some((v) => Number.isNaN(v))) {
        return res.status(400).json({ error: 'Invalid input values' });
    }

    let yieldValue = null;
    let confidence = null;
    let crop = '';
    try {
        const mlUrl = process.env.ML_API_URL || 'http://127.0.0.1:5001';

        const resp = await fetch(`${mlUrl}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nitrogen,
                phosphorus,
                potassium,
                temperature,
                humidity,
                ph_value: phValue,
                rainfall
            })
        });

        if (!resp.ok) {
            console.error("ML API ERROR:", await resp.text());
        } else {
            const data = await resp.json();
            crop = data.crop || 'Unknown';
            confidence = data.confidence ?? null;
        }
    } catch (e) {
        console.error("ML API connection failed:", e.message);
    }

    if (!crop) crop = 'Unknown';

    const recommendations = [
        nitrogen < 50 ? 'Nitrogen low: consider urea or compost.' : 'Nitrogen is adequate.',
        phosphorus < 40 ? 'Phosphorus low: consider DAP/SSP.' : 'Phosphorus is adequate.',
        potassium < 40 ? 'Potassium low: consider MOP.' : 'Potassium is adequate.',
        rainfall < 200 ? 'Low rainfall: plan irrigation schedule.' : 'Rainfall is sufficient.'
    ];

    if (hasSupabase) {
        try {
            const userClient = getUserClient(req);
            await userClient.from('predictions').insert({
                user_id: req.session.user.id,
                crop,
                yield: yieldValue || 0
            });
        } catch (e) {
            // ignore if table doesn't exist
        }
    }

    return res.json({
        yield: Number(yieldValue) || 0,
        crop,
        confidence,
        recommendations
    });
});

app.listen(PORT, () => {
    console.log(`EcoHarvest server running on http://localhost:${PORT}`);
});
