"""Tools the assistant can call: open a page of the site, and look up patent prices, guides, vacancies and the
visitor's own documents. Every tool returns plain data; the model writes the answer."""
import json
from urllib.parse import urlencode

from django.db.models import Q
from django.utils import timezone

from documents.models import DocumentType, GuideStep, Region, UserDocument
from jobs.models import INDUSTRIES, Job

# The pages navigate may open, and their addresses in the React app.
PAGES = {
    "home": "/",
    "documents": "/documents",
    "payments": "/payments",
    "jobs": "/jobs",
    "saved_jobs": "/saved-jobs",
    "calculator": "/calculator",
    "guides": "/guides",
    "news": "/guides#news",
    "checks": "/checks",
    "exam": "/exam",
    "help": "/help",
    "notifications": "/notifications",
    "profile": "/profile",
    "login": "/login",
}
DOCUMENT_SLUGS = ["patent", "registration", "migration-card", "insurance-dms", "medical"]
INDUSTRY_KEYS = [key for key, _ in INDUSTRIES]
MAX_JOBS = 5

TOOLS = [
    {
        "name": "navigate",
        "description": (
            "Opens a page of the site for the visitor. For jobs you may add filters (search words, city, industry, "
            "housing). For guides you may open the guide of one document."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "page": {"type": "string", "enum": list(PAGES), "description": "Which page to open."},
                "job_search": {"type": "string", "description": "jobs only: profession or key words, in Russian, e.g. курьер."},
                "job_city": {"type": "string", "description": "jobs only: city in Russian, e.g. Москва."},
                "job_industry": {"type": "string", "enum": INDUSTRY_KEYS, "description": "jobs only: industry."},
                "job_housing": {"type": "boolean", "description": "jobs only: only jobs that give housing."},
                "guide_document": {"type": "string", "enum": DOCUMENT_SLUGS, "description": "guides only: which document."},
            },
            "required": ["page"],
            "additionalProperties": False,
        },
    },
    {
        "name": "patent_price",
        "description": "The monthly patent price for 2026 in a region (or city) of Russia, e.g. Москва, Санкт-Петербург, Свердловская.",
        "input_schema": {
            "type": "object",
            "properties": {"region": {"type": "string", "description": "Region or city name in Russian."}},
            "required": ["region"],
            "additionalProperties": False,
        },
    },
    {
        "name": "guide_steps",
        "description": "The official step-by-step guide for a document: steps, where to go, what to bring, costs and deadlines.",
        "input_schema": {
            "type": "object",
            "properties": {"document": {"type": "string", "enum": DOCUMENT_SLUGS}},
            "required": ["document"],
            "additionalProperties": False,
        },
    },
    {
        "name": "find_jobs",
        "description": f"Searches the real vacancies on the site. Returns up to {MAX_JOBS} with salary, city and address.",
        "input_schema": {
            "type": "object",
            "properties": {
                "search": {"type": "string", "description": "Profession or key words in Russian."},
                "city": {"type": "string", "description": "City in Russian."},
                "industry": {"type": "string", "enum": INDUSTRY_KEYS},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "my_documents",
        "description": "The visitor's own documents on the site with their end dates (only when they are logged in).",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
]


def _navigate(args):
    page = args.get("page")
    if page not in PAGES:
        return {"error": f"page must be one of: {', '.join(PAGES)}"}
    path = PAGES[page]
    if page == "jobs":
        query = {
            "search": (args.get("job_search") or "").strip(),
            "city": (args.get("job_city") or "").strip(),
            "industry": args.get("job_industry") if args.get("job_industry") in INDUSTRY_KEYS else "",
            "housing_provided": "true" if args.get("job_housing") else "",
        }
        query = {k: v for k, v in query.items() if v}
        if query:
            path += "?" + urlencode(query)
    elif page == "guides" and args.get("guide_document"):
        doc = DocumentType.objects.filter(slug=args["guide_document"]).first()
        if doc:
            path += f"?type={doc.id}"
    return {"opened": path}


def _patent_price(args):
    name = (args.get("region") or "").strip()
    if not name:
        return {"error": "give a region name"}
    regions = list(Region.objects.filter(name__icontains=name)[:5])
    if not regions:
        # Russian word endings change ("Свердловской области" / "Свердловская область"): match word stems.
        stems = [w[: max(3, len(w) - 3)] for w in name.replace("-", " ").split() if len(w) > 3]
        query = Region.objects.all()
        for stem in stems:
            query = query.filter(name__icontains=stem)
        regions = list(query[:5]) if stems else []
    if not regions:
        return {"error": f"no region found for «{name}»"}
    return {"regions": [{"name": r.name, "monthly_rub": int(r.patent_monthly_price), "year": r.price_year} for r in regions]}


def _guide_steps(args):
    doc = DocumentType.objects.filter(slug=args.get("document")).first()
    if doc is None:
        return {"error": "unknown document"}
    steps = [
        {
            "step": s.order, "title": s.title, "what_to_do": s.body, "where": s.where,
            "bring": [line for line in s.required_papers.splitlines() if line.strip()],
            "cost": s.cost_note, "deadline": s.deadline_note,
        }
        for s in GuideStep.objects.filter(document_type=doc).order_by("order")
    ]
    return {"document": doc.title, "description": doc.description, "steps": steps}


def _find_jobs(args):
    jobs = Job.objects.filter(is_active=True, expires_at__gt=timezone.now(), employer__is_blacklisted=False)
    if args.get("search"):
        words = args["search"].strip()
        jobs = jobs.filter(Q(title__icontains=words) | Q(description__icontains=words))
    if args.get("city"):
        jobs = jobs.filter(city__icontains=args["city"].strip())
    if args.get("industry") in INDUSTRY_KEYS:
        jobs = jobs.filter(industry=args["industry"])
    total = jobs.count()
    found = [
        {
            "title": j.title, "company": j.employer.name, "city": j.city, "address": j.address,
            "salary_from": j.salary_from, "salary_to": j.salary_to,
            "housing": j.housing_provided, "meals": j.meals_provided,
        }
        for j in jobs.select_related("employer").order_by("-created_at")[:MAX_JOBS]
    ]
    return {"total": total, "jobs": found}


def _my_documents(user):
    if not user or not user.is_authenticated:
        return {"error": "the visitor is not logged in; they can log in to add documents"}
    today = timezone.localdate()
    docs = UserDocument.objects.filter(user=user).select_related("document_type").order_by("expires_at")
    return {
        "documents": [
            {"type": d.document_type.title, "ends": d.expires_at.strftime("%d.%m.%Y"), "days_left": (d.expires_at - today).days}
            for d in docs
        ]
    }


def run_tool(name, tool_input, user=None):
    """Runs a tool and returns (text for the model, is_error, path to open or None)."""
    tool_input = tool_input if isinstance(tool_input, dict) else {}
    if name == "navigate":
        result = _navigate(tool_input)
    elif name == "patent_price":
        result = _patent_price(tool_input)
    elif name == "guide_steps":
        result = _guide_steps(tool_input)
    elif name == "find_jobs":
        result = _find_jobs(tool_input)
    elif name == "my_documents":
        result = _my_documents(user)
    else:
        return f"Unknown tool {name}", True, None
    return json.dumps(result, ensure_ascii=False), "error" in result, result.get("opened")
